import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, MemoryStore, provideAgentOrm, SessionStore, TypeOrmCommandExchangeStore } from '@tsdi/agent';
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { EventHandler } from '../src/api/EventHandler';
import { SessionHandler } from '../src/api/SessionHandler';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

@Suite('Gateway command_exchange.* RPCs (P278/P284)')
export class CommandExchangeRpcTest {
    protected async createHarness() {
        const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const store = context.get(SessionStore);
        const memory = context.get(MemoryStore);
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const exchange = context.get(TypeOrmCommandExchangeStore);
        const runtime = {
            async runTurn(sessionId: string, input: string) {
                await store.append(sessionId, { id: 'u-replay', role: 'user', content: input, createdAt: 1 } as any);
                await store.append(sessionId, { id: 'a-replay', role: 'assistant', content: `replayed:${input}`, createdAt: 2 } as any);
                return { ok: true };
            },
            async getMessages(sessionId: string) {
                return (await store.get(sessionId)).messages;
            },
            async searchMemory() {
                return [];
            }
        } as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(
            runtime, new RandomUuidGenerator(), store, memory,
            { getToolDefinitions: () => [] } as any,
            owners, sessions, events,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined,
            exchange
        );
        return { store, memory, owners, events, exchange, rpc, context };
    }

    protected async call(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1') {
        return rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
    }

    @Test('registers command_exchange.append capability')
    async capabilitiesRegistered() {
        const { rpc, context } = await this.createHarness();
        try {
            const response = await this.call(rpc, 'app.capabilities', {});
            const methods: string[] = (response as any).result?.methods ?? [];
            expect(methods).toContain('command_exchange.append');
            expect(methods).toContain('command_exchange.query');
            expect(methods).toContain('command_exchange.replay');
        } finally {
            await context.close();
        }
    }

    @Test('append writes a record visible to query and replay')
    async appendThenRead() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-1', 'user-1');
        try {
            const append = await this.call(rpc, 'command_exchange.append', {
                sessionId: 'ces-1',
                record: { id: 'r-1', kind: 'command', key: 'bash', content: 'git status', sequence: 0 }
            });
            expect((append as any).error).toBeUndefined();
            const result = (append as any).result;
            expect(result.sessionId).toBe('ces-1');
            expect(result.record.id).toBe('r-1');

            const query = await this.call(rpc, 'command_exchange.query', { sessionId: 'ces-1' });
            expect((query as any).error).toBeUndefined();
            expect((query as any).result.records.length).toBe(1);
            expect((query as any).result.records[0].content).toBe('git status');

            const replay = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-1', sinceSeq: -1 });
            expect((replay as any).error).toBeUndefined();
            const replayed = (replay as any).result.records;
            expect(replayed.length).toBe(1);
            expect(replayed[0].seq).toBe(0);
        } finally {
            await context.close();
        }
    }

    @Test('append is ownership-enforced for a foreign principal')
    async appendForbidden() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-owner', 'user-1');
        try {
            const appender = await this.call(rpc, 'command_exchange.append', {
                sessionId: 'ces-owner',
                record: { id: 'r-x', kind: 'command', key: 'bash', content: 'attack' }
            }, 'user-2');
            expect((appender as any).error).toBeDefined();
        } finally {
            await context.close();
        }
    }

    @Test('append rejects a missing record with -32602')
    async appendMissingRecord() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-2', 'user-1');
        try {
            const bad = await this.call(rpc, 'command_exchange.append', { sessionId: 'ces-2' });
            expect((bad as any).error).toBeDefined();
            expect((bad as any).error.code).toEqual(-32602);
        } finally {
            await context.close();
        }
    }

    @Test('append is idempotent by record id')
    async appendIdempotent() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-dup', 'user-1');
        try {
            const first = await this.call(rpc, 'command_exchange.append', {
                sessionId: 'ces-dup',
                record: { id: 'r-dup', kind: 'command', key: 'bash', content: 'git status', sequence: 0 }
            });
            expect((first as any).error).toBeUndefined();
            const second = await this.call(rpc, 'command_exchange.append', {
                sessionId: 'ces-dup',
                record: { id: 'r-dup', kind: 'command', key: 'bash', content: 'git status --porcelain', sequence: 1 }
            });
            expect((second as any).error).toBeUndefined();
            expect((second as any).result.record.seq).toEqual((first as any).result.record.seq);
            expect((second as any).result.record.content).toBe('git status');

            const query = await this.call(rpc, 'command_exchange.query', { sessionId: 'ces-dup' });
            expect((query as any).result.records.length).toBe(1);
            const replay = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-dup', sinceSeq: -1 });
            expect((replay as any).result.records.length).toBe(1);
        } finally {
            await context.close();
        }
    }

    @Test('store seq stays monotonic under out-of-order client sequence')
    async outOfOrderClientSequence() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-ooo', 'user-1');
        try {
            for (const [index, sequence] of [5, 1, 3].entries()) {
                const append = await this.call(rpc, 'command_exchange.append', {
                    sessionId: 'ces-ooo',
                    record: { id: `r-ooo-${index}`, kind: 'command', key: 'bash', content: `c${sequence}`, sequence }
                });
                expect((append as any).error).toBeUndefined();
            }
            const replay = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-ooo', sinceSeq: -1 });
            const replayed = (replay as any).result.records;
            expect(replayed.map((r: any) => r.seq)).toEqual([0, 1, 2]);
            expect(replayed.map((r: any) => r.sequence)).toEqual([5, 1, 3]);
        } finally {
            await context.close();
        }
    }

    @Test('replay and query are cross-session isolated')
    async crossSessionIsolation() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-a', 'user-1');
        await owners.create('ces-b', 'user-1');
        try {
            await this.call(rpc, 'command_exchange.append', {
                sessionId: 'ces-a',
                record: { id: 'r-a', kind: 'command', key: 'bash', content: 'in-a', sequence: 0 }
            });
            const queryB = await this.call(rpc, 'command_exchange.query', { sessionId: 'ces-b' });
            expect((queryB as any).result.records.length).toBe(0);
            const replayB = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-b', sinceSeq: -1 });
            expect((replayB as any).result.records.length).toBe(0);
            const replayA = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-a', sinceSeq: -1 });
            expect((replayA as any).result.records.length).toBe(1);
        } finally {
            await context.close();
        }
    }

    @Test('query and replay are ownership-enforced for a foreign principal')
    async queryReplayForbidden() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-fp', 'user-1');
        try {
            await this.call(rpc, 'command_exchange.append', {
                sessionId: 'ces-fp',
                record: { id: 'r-fp', kind: 'command', key: 'bash', content: 'secret', sequence: 0 }
            });
            const query = await this.call(rpc, 'command_exchange.query', { sessionId: 'ces-fp' }, 'user-2');
            expect((query as any).error).toBeDefined();
            const replay = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-fp', sinceSeq: -1 }, 'user-2');
            expect((replay as any).error).toBeDefined();
        } finally {
            await context.close();
        }
    }

    @Test('replay fuzz: contiguous ascending seqs and cursor walk covers every record once')
    async replayFuzzAndCursorWalk() {
        const { owners, rpc, context } = await this.createHarness();
        await owners.create('ces-fuzz', 'user-1');
        try {
            const total = 150;
            for (let i = 0; i < total; i++) {
                const append = await this.call(rpc, 'command_exchange.append', {
                    sessionId: 'ces-fuzz',
                    record: { id: `r-fuzz-${i}`, kind: 'command', key: 'bash', content: `step-${i}`, sequence: i }
                });
                expect((append as any).error).toBeUndefined();
            }
            const replay = await this.call(rpc, 'command_exchange.replay', { sessionId: 'ces-fuzz', sinceSeq: -1 });
            const replayed = (replay as any).result.records;
            expect(replayed.length).toBe(total);
            expect(replayed.map((r: any) => r.seq)).toEqual(Array.from({ length: total }, (_, i) => i));

            const seen: number[] = [];
            let cursor: string | undefined;
            let guard = 0;
            do {
                const page = await this.call(rpc, 'command_exchange.query', {
                    sessionId: 'ces-fuzz',
                    limit: 25,
                    ...(cursor ? { cursor } : {})
                });
                expect((page as any).error).toBeUndefined();
                const result = (page as any).result;
                seen.push(...result.records.map((r: any) => r.seq));
                cursor = result.nextCursor;
                guard++;
            } while (cursor && guard < 20);
            expect(seen).toEqual(Array.from({ length: total }, (_, i) => i));
        } finally {
            await context.close();
        }
    }
}
