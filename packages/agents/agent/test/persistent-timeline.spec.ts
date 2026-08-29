import expect = require('expect');
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AgentOrmModule } from '../src/orm.module';
import { TypeOrmTimelineHistoryStore } from '../src/memory/TypeOrmTimelineHistoryStore';

@Module({
    imports: [
        AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    ],
    providers: [
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() },
        TypeOrmTimelineHistoryStore
    ]
})
class PersistentTimelineTestModule {
}

describe('Persistent timeline store', () => {
    it('persists raw events with per-session monotonic seq', async () => {
        const ctx = await Application.run(PersistentTimelineTestModule);
        try {
            const store = ctx.get(TypeOrmTimelineHistoryStore) as TypeOrmTimelineHistoryStore;
            const first = await store.append({ id: 'evt-1', type: 'tool_invoked', sessionId: 's1', timestamp: 100, toolName: 'bash', toolCallId: 'tc-1', receiptId: 'rc-1' });
            const second = await store.append({ id: 'evt-2', type: 'tool_completed', sessionId: 's1', timestamp: 200, toolName: 'bash', toolCallId: 'tc-1', receiptId: 'rc-1', status: 'success', durationMs: 100 });
            expect(first.seq).toEqual(0);
            expect(second.seq).toEqual(1);
            const raw = await store.get('s1');
            expect(raw.length).toEqual(2);
            expect(raw[0].seq).toEqual(0);
            expect(raw[0].id).toEqual('evt-1');
            expect(raw[1].seq).toEqual(1);
            expect(raw[1].status).toEqual('success');
        } finally {
            await ctx.close();
        }
    });

    it('keeps per-session seq counters independent', async () => {
        const ctx = await Application.run(PersistentTimelineTestModule);
        try {
            const store = ctx.get(TypeOrmTimelineHistoryStore) as TypeOrmTimelineHistoryStore;
            const a0 = await store.append({ id: 'a-0', type: 'turn_started', sessionId: 'sA', timestamp: 1, turnId: 'a-0' });
            const b0 = await store.append({ id: 'b-0', type: 'turn_started', sessionId: 'sB', timestamp: 2, turnId: 'b-0' });
            const a1 = await store.append({ id: 'a-1', type: 'turn_completed', sessionId: 'sA', timestamp: 3, turnId: 'a-0' });
            expect(a0.seq).toEqual(0);
            expect(b0.seq).toEqual(0);
            expect(a1.seq).toEqual(1);
            expect((await store.get('sA')).length).toEqual(2);
            expect((await store.get('sB')).length).toEqual(1);
        } finally {
            await ctx.close();
        }
    });

    it('replays raw events strictly after sinceSeq', async () => {
        const ctx = await Application.run(PersistentTimelineTestModule);
        try {
            const store = ctx.get(TypeOrmTimelineHistoryStore) as TypeOrmTimelineHistoryStore;
            for (let index = 0; index < 4; index++) {
                await store.append({ id: `t-${index}`, type: 'tool_invoked', sessionId: 's-replay', timestamp: index, toolName: 'bash', toolCallId: `tc-${index}`, receiptId: `rc-${index}` });
            }
            const tail = await store.replay('s-replay', 1);
            expect(tail.length).toEqual(2);
            expect(tail[0].seq).toEqual(2);
            expect(tail[1].seq).toEqual(3);
            expect(await store.replay('s-replay', 3)).toEqual([]);
        } finally {
            await ctx.close();
        }
    });

    it('queries cursor-paged projected entries with hasMore and aggregates tool calls', async () => {
        const ctx = await Application.run(PersistentTimelineTestModule);
        try {
            const store = ctx.get(TypeOrmTimelineHistoryStore) as TypeOrmTimelineHistoryStore;
            for (let index = 0; index < 5; index++) {
                await store.append({ id: `i-${index}`, type: 'tool_invoked', sessionId: 's-page', timestamp: index * 10, toolName: 'bash', toolCallId: `tc-${index}`, receiptId: `rc-${index}` });
            }
            const first = await store.query('s-page', { limit: 2 });
            expect(first.entries.length).toEqual(2);
            expect(first.hasMore).toEqual(true);
            expect(first.nextCursor).toBeDefined();
            const second = await store.query('s-page', { limit: 2, cursor: first.nextCursor });
            expect(second.entries.length).toEqual(2);
            expect(second.hasMore).toEqual(true);
            const third = await store.query('s-page', { limit: 2, cursor: second.nextCursor });
            expect(third.entries.length).toEqual(1);
            expect(third.hasMore).toEqual(false);
            expect(third.nextCursor).toBeUndefined();
            expect(third.entries[0].kind).toEqual('tool');
            expect(third.entries[0].status).toEqual('running');
            expect(third.entries[0].toolCallId).toEqual('tc-4');
        } finally {
            await ctx.close();
        }
    });

    it('reloads persisted timeline and merges tool lifecycle into a single entry', async () => {
        const ctx = await Application.run(PersistentTimelineTestModule);
        try {
            const store = ctx.get(TypeOrmTimelineHistoryStore) as TypeOrmTimelineHistoryStore;
            await store.append({ id: 'inv', type: 'tool_invoked', sessionId: 's-life', timestamp: 100, toolName: 'bash', toolCallId: 'tc-1', receiptId: 'rc-1' });
            await store.append({ id: 'done', type: 'tool_completed', sessionId: 's-life', timestamp: 200, toolName: 'bash', toolCallId: 'tc-1', receiptId: 'rc-1', status: 'success', durationMs: 100 });
            const loaded = await store.query('s-life');
            expect(loaded.entries.length).toEqual(1);
            expect(loaded.entries[0].status).toEqual('success');
            expect(loaded.entries[0].startedAt).toEqual(100);
            expect(loaded.entries[0].endedAt).toEqual(200);
            expect(loaded.entries[0].durationMs).toEqual(100);
        } finally {
            await ctx.close();
        }
    });
});