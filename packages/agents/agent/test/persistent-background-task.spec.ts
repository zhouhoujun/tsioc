import expect = require('expect');
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AgentOrmModule } from '../src/orm.module';
import { TypeOrmBackgroundTaskStore } from '../src/memory/TypeOrmBackgroundTaskStore';
import { BackgroundTaskRecord } from '../src/memory/background-task-store';

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
        TypeOrmBackgroundTaskStore
    ]
})
class PersistentBackgroundTaskTestModule {
}

function record(partial: Partial<BackgroundTaskRecord> & { id: string; sessionId: string }): BackgroundTaskRecord {
    return {
        status: partial.status ?? 'running',
        goal: partial.goal ?? 'default goal',
        startedAt: partial.startedAt ?? Date.now(),
        ...partial
    };
}

describe('Persistent background-task store', () => {
    it('puts and gets records, idempotently replacing by id', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            await store.put(record({ id: 'task-1', sessionId: 's1', goal: 'run build', status: 'running' }));
            const loaded = await store.get('task-1');
            expect(loaded?.id).toEqual('task-1');
            expect(loaded?.goal).toEqual('run build');
            expect(loaded?.status).toEqual('running');

            await store.put(record({ id: 'task-1', sessionId: 's1', goal: 'run build', status: 'completed', result: { content: 'ok', turnCount: 1, toolCalls: 2 } }));
            const replaced = await store.get('task-1');
            expect(replaced?.status).toEqual('completed');
            expect(replaced?.result?.content).toEqual('ok');
            expect((await store.pageAll()).items.length).toEqual(1);
        } finally {
            await ctx.close();
        }
    });

    it('pages all tasks with cursor and hasMore across a reload', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            for (let index = 0; index < 5; index++) {
                await store.put(record({ id: `t-${index}`, sessionId: 's-page', startedAt: 1000 + index }));
            }
            const first = await store.pageAll({ limit: 2 });
            expect(first.items.length).toEqual(2);
            expect(first.items[0].id).toEqual('t-4');
            expect(first.hasMore).toEqual(true);
            expect(first.nextCursor).toBeDefined();
            const second = await store.pageAll({ limit: 2, cursor: first.nextCursor });
            expect(second.items.length).toEqual(2);
            expect(second.items[0].id).toEqual('t-2');
            const third = await store.pageAll({ limit: 2, cursor: second.nextCursor });
            expect(third.items.length).toEqual(1);
            expect(third.hasMore).toEqual(false);
            expect(third.nextCursor).toBeUndefined();
        } finally {
            await ctx.close();
        }
    });

    it('filters by session and isolates projects', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            await store.put(record({ id: 'a-1', sessionId: 'sA', startedAt: 1 }));
            await store.put(record({ id: 'b-1', sessionId: 'sB', startedAt: 2 }));
            await store.put(record({ id: 'a-2', sessionId: 'sA', startedAt: 3 }));
            const a = await store.pageBySession('sA');
            expect(a.items.length).toEqual(2);
            expect(a.items[0].id).toEqual('a-2');
            const b = await store.pageBySession('sB');
            expect(b.items.length).toEqual(1);
            expect(b.items[0].id).toEqual('b-1');
        } finally {
            await ctx.close();
        }
    });

    it('batch cancels running tasks only and persists the cancelled status', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            await store.put(record({ id: 'run-1', sessionId: 's-cancel', status: 'running' }));
            await store.put(record({ id: 'done-1', sessionId: 's-cancel', status: 'completed' }));
            const cancelled = await store.batchCancel(['run-1', 'done-1', 'missing']);
            expect(cancelled).toEqual(['run-1']);
            expect((await store.get('run-1'))?.status).toEqual('cancelled');
            expect((await store.get('run-1'))?.finishedAt).toBeDefined();
            expect((await store.get('done-1'))?.status).toEqual('completed');
        } finally {
            await ctx.close();
        }
    });

    it('pages across multiple sessions with de-duplication and cursor paging', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            await store.put(record({ id: 'a-1', sessionId: 'sA', startedAt: 1 }));
            await store.put(record({ id: 'b-1', sessionId: 'sB', startedAt: 2 }));
            await store.put(record({ id: 'a-2', sessionId: 'sA', startedAt: 3 }));
            await store.put(record({ id: 'c-1', sessionId: 'sC', startedAt: 4 }));

            const all = await store.pageBySessions(['sA', 'sB', 'sC']);
            expect(all.items.length).toEqual(4);
            expect(all.items.map(item => item.id)).toEqual(['c-1', 'a-2', 'b-1', 'a-1']);

            const deduped = await store.pageBySessions(['sA', 'sA', 'sB', 'sC', 'sB']);
            expect(deduped.items.length).toEqual(4);

            const first = await store.pageBySessions(['sA', 'sB', 'sC'], { limit: 2 });
            expect(first.items.map(item => item.id)).toEqual(['c-1', 'a-2']);
            expect(first.hasMore).toEqual(true);
            expect(first.nextCursor).toBeDefined();

            const second = await store.pageBySessions(['sA', 'sB', 'sC'], { limit: 2, cursor: first.nextCursor });
            expect(second.items.map(item => item.id)).toEqual(['b-1', 'a-1']);
            expect(second.hasMore).toEqual(false);
        } finally {
            await ctx.close();
        }
    });

    it('returns empty pages for empty, unknown, or blank session lists', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            await store.put(record({ id: 'a-1', sessionId: 'sA', startedAt: 1 }));
            expect((await store.pageBySessions([])).items.length).toEqual(0);
            expect((await store.pageBySessions(['unknown'])).items.length).toEqual(0);
            expect((await store.pageBySessions(['', '  '])).items.length).toEqual(0);
            const onlyKnown = await store.pageBySessions(['sA', 'unknown']);
            expect(onlyKnown.items.length).toEqual(1);
            expect(onlyKnown.items[0].id).toEqual('a-1');
        } finally {
            await ctx.close();
        }
    });

    it('notifies subscribers on put and batchCancel', async () => {
        const ctx = await Application.run(PersistentBackgroundTaskTestModule);
        try {
            const store = ctx.get(TypeOrmBackgroundTaskStore) as TypeOrmBackgroundTaskStore;
            const seen: string[] = [];
            const unsub = store.subscribe(rec => seen.push(`${rec.id}:${rec.status}`));
            await store.put(record({ id: 'sub-1', sessionId: 's-sub', status: 'running' }));
            await store.put(record({ id: 'sub-1', sessionId: 's-sub', status: 'completed' }));
            await store.batchCancel(['sub-1']);
            expect(seen).toEqual(['sub-1:running', 'sub-1:completed']);
            unsub();
            await store.put(record({ id: 'sub-2', sessionId: 's-sub', status: 'running' }));
            expect(seen.length).toEqual(2);
        } finally {
            await ctx.close();
        }
    });
});
