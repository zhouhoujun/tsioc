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
}
