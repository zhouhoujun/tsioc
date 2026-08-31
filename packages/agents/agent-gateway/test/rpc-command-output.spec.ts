import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore, InMemoryMemoryStore, MemoryCommandOutputStore, AgentConsoleCommandOutputHistoryEntry } from '@tsdi/agent';
import { RandomUuidGenerator } from '@tsdi/core';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { EventHandler } from '../src/api/EventHandler';
import { SessionHandler } from '../src/api/SessionHandler';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

const WORKSPACE = '/tmp/rpc-command-output';

/** Mirror the gateway record-id scheme so tests can seed durable history directly. */
function recordId(principalId: string, sessionId: string): string {
    return `agent-ui:console-command-output:${encodeURIComponent(principalId)}:${encodeURIComponent(WORKSPACE)}:${encodeURIComponent(sessionId)}`;
}

@Suite('Gateway command_output.* RPCs (P267)')
export class CommandOutputRpcTest {
    protected createHarness(runtimeOverrides: any = {}) {
        const store = new InMemorySessionStore();
        const memory = new InMemoryMemoryStore();
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
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
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, { getToolDefinitions: () => [] } as any, owners, sessions, events);
        return { store, memory, owners, rpc };
    }

    protected async call(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1') {
        return rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
    }

    protected async seed(harness: { memory: InMemoryMemoryStore }, principalId: string, sessionId: string, entries: AgentConsoleCommandOutputHistoryEntry[]) {
        const out = new MemoryCommandOutputStore(harness.memory, recordId(principalId, sessionId));
        for (const entry of entries) {
            await out.append({ sessionId, source: 'rpc', ...entry });
        }
    }

    @Test('registers the four command_output capabilities')
    async capabilitiesRegistered() {
        const { rpc } = this.createHarness();
        const response = await rpc.handle({ jsonrpc: '2.0', id: 1, method: 'app.capabilities', params: {} }, { principalId: 'user-1' });
        const methods: string[] = (response as any).result?.methods ?? [];
        for (const method of ['command_output.list', 'command_output.get', 'command_output.replay', 'command_output.clear']) {
            expect(methods).toContain(method);
        }
    }

    @Test('command_output.list returns seeded durable entries newest-first with totals')
    async listReturnsSeededEntries() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-s1', 'user-1');
        await this.seed(harness, 'user-1', 'co-s1', [
            { id: 'c1', command: 'echo one', text: 'one', ts: 10, kind: 'result' },
            { id: 'c2', command: 'ls -la', text: 'two', ts: 20, kind: 'result' }
        ]);

        const response = await this.call(rpc, 'command_output.list', { sessionId: 'co-s1', workspace: WORKSPACE });
        expect((response as any)?.error).toBeUndefined();
        const result = (response as any).result;
        expect(result.total).toEqual(2);
        const ids = result.items.map((item: any) => item.id);
        expect(ids).toEqual(['c2', 'c1']); // newest-first
    }

    @Test('command_output.list supports cursor pagination')
    async listSupportsCursorPagination() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-s2', 'user-1');
        const entries = Array.from({ length: 25 }, (_, index) => ({
            id: `c-${index}`,
            command: `cmd ${index}`,
            text: `out ${index}`,
            ts: index,
            kind: 'result' as const
        }));
        await this.seed(harness, 'user-1', 'co-s2', entries);

        const pageOne = await this.call(rpc, 'command_output.list', { sessionId: 'co-s2', workspace: WORKSPACE, limit: 20 });
        const first = (pageOne as any).result;
        expect(first.total).toEqual(25);
        expect(first.items.length).toEqual(20);
        expect(first.nextCursor).toBeTruthy();

        const pageTwo = await this.call(rpc, 'command_output.list', { sessionId: 'co-s2', workspace: WORKSPACE, limit: 20, cursor: first.nextCursor });
        const second = (pageTwo as any).result;
        expect(second.items.length).toEqual(5);
        expect(second.nextCursor).toBeUndefined();
        expect(second.total).toEqual(25);
    }

    @Test('command_output.get returns a single entry and null for unknown id')
    async getReturnsEntryAndNullForUnknown() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-s3', 'user-1');
        await this.seed(harness, 'user-1', 'co-s3', [
            { id: 'g1', command: 'git status', text: 'clean', ts: 5, kind: 'result' }
        ]);

        const found = await this.call(rpc, 'command_output.get', { sessionId: 'co-s3', workspace: WORKSPACE, id: 'g1' });
        expect((found as any).result.id).toEqual('g1');
        expect((found as any).result.command).toEqual('git status');

        const missing = await this.call(rpc, 'command_output.get', { sessionId: 'co-s3', workspace: WORKSPACE, id: 'nope' });
        expect((missing as any).result).toBeNull();
    }

    @Test('command_output.get redacts secrets from stored text')
    async getRedactsSecrets() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-s4', 'user-1');
        await this.seed(harness, 'user-1', 'co-s4', [
            { id: 'g-secret', command: 'echo sk-abcdefgh12345678', text: 'sk-abcdefgh12345678', ts: 5, kind: 'result' }
        ]);

        const found = await this.call(rpc, 'command_output.get', { sessionId: 'co-s4', workspace: WORKSPACE, id: 'g-secret' });
        const entry = (found as any).result;
        expect(entry.text).toEqual('[REDACTED]');
        expect(entry.text).not.toContain('sk-abcdefgh12345678');
    }

    @Test('command_output.clear removes entries for the session only and reports the count')
    async clearRemovesSessionEntriesOnly() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-s5', 'user-1');
        await owners.create('co-s6', 'user-1');
        await this.seed(harness, 'user-1', 'co-s5', [{ id: 'keep-a', command: 'a', text: 'a', ts: 1, kind: 'result' }]);
        await this.seed(harness, 'user-1', 'co-s6', [{ id: 'keep-b', command: 'b', text: 'b', ts: 1, kind: 'result' }]);

        const cleared = await this.call(rpc, 'command_output.clear', { sessionId: 'co-s5', workspace: WORKSPACE });
        expect((cleared as any).result).toEqual({ removed: 1 });

        // Session A is now empty.
        const listA = await this.call(rpc, 'command_output.list', { sessionId: 'co-s5', workspace: WORKSPACE });
        expect((listA as any).result.total).toEqual(0);
        // Session B is untouched.
        const listB = await this.call(rpc, 'command_output.list', { sessionId: 'co-s6', workspace: WORKSPACE });
        expect((listB as any).result.total).toEqual(1);
    }

    @Test('denies access to sessions owned by another principal')
    async deniesCrossPrincipalAccess() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-other', 'user-1');
        await this.seed(harness, 'user-1', 'co-other', [{ id: 'private', command: 'p', text: 'p', ts: 1, kind: 'result' }]);

        const response = await this.call(rpc, 'command_output.list', { sessionId: 'co-other', workspace: WORKSPACE }, 'user-2');
        expect((response as any).error).toBeDefined();
        expect((response as any).error.code).toEqual(-32003);
    }

    @Test('command_output.replay dispatches the stored command through runTurn and returns last message')
    async replayDispatchesCommand() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-replay', 'user-1');
        await this.seed(harness, 'user-1', 'co-replay', [
            { id: 'r1', command: 'npm test', text: 'ok', ts: 1, kind: 'result' }
        ]);

        const replay = await this.call(rpc, 'command_output.replay', { sessionId: 'co-replay', workspace: WORKSPACE, id: 'r1' });
        expect((replay as any)?.error).toBeUndefined();
        const result = (replay as any).result;
        expect(result.sessionId).toEqual('co-replay');
        const messages = await harness.store.get('co-replay');
        const last = messages.messages[messages.messages.length - 1];
        expect(last.content).toEqual('replayed:npm test');
    }

    @Test('command_output.replay errors when the entry has no command')
    async replayRejectsCommandlessEntry() {
        const harness = this.createHarness();
        const { owners, rpc } = harness;
        await owners.create('co-replay-empty', 'user-1');
        await this.seed(harness, 'user-1', 'co-replay-empty', [
            { id: 'r-empty', command: '', text: 'notice only', ts: 1, kind: 'notice' }
        ]);

        const replay = await this.call(rpc, 'command_output.replay', { sessionId: 'co-replay-empty', workspace: WORKSPACE, id: 'r-empty' });
        expect((replay as any).error).toBeDefined();
        expect((replay as any).error.code).toEqual(-32602);
    }

    @Test('errors when requesting history for a non-existent session')
    async rejectsUnknownSession() {
        const { rpc } = this.createHarness();
        const response = await this.call(rpc, 'command_output.list', { sessionId: 'no-such-session', workspace: WORKSPACE });
        expect((response as any).error).toBeDefined();
        expect((response as any).error.code).toEqual(-32004);
    }
}
