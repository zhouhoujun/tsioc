import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, MemoryStore, provideAgentOrm, SessionStore } from '@tsdi/agent';
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { EventHandler } from '../src/api/EventHandler';
import { SessionHandler } from '../src/api/SessionHandler';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';

@Suite('Gateway harness rejected-actions RPCs (P147)')
export class HarnessRejectedActionsRpcTest {
    protected async createHarness(records: any[], toolInvoke?: (name: string, input: any) => Promise<any> | any) {
        const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const store = context.get(SessionStore);
        const memory = context.get(MemoryStore);
        const owners = new SessionOwnerStore(store);
        const events = new EventHandler(owners);
        const turnDiagnostics = {
            async list(sessionId?: string) {
                return sessionId ? records.filter(record => record.sessionId === sessionId) : records;
            }
        } as any;
        const tools = {
            getToolDefinitions: () => [],
            async invoke(name: string, input: any) {
                if (toolInvoke) return toolInvoke(name, input);
                return { ok: true };
            }
        } as any;
        const runtime = {} as any;
        const sessions = new SessionHandler(runtime, store, owners);
        const rpc = new AppRpcServer(runtime, new RandomUuidGenerator(), store, memory, tools, owners, sessions, events, {}, null, null, null, null, turnDiagnostics);
        return { store, owners, rpc, context };
    }

    protected async call(rpc: AppRpcServer, method: string, params: any, principalId = 'user-1') {
        const response = await rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
        if ((response as any)?.error) {
            throw new Error(`${method} failed: ${(response as any).error.message}`);
        }
        return (response as any)?.result;
    }

    @Test('harness.rejected_actions returns the most recent falsified evidence')
    async listsRejectedActions() {
        const { store, owners, rpc } = await this.createHarness([
            {
                id: 't1', sessionId: 's1', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0,
                followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false,
                compactionCount: 0, totalTokenSavings: 0,
                evidence: {
                    turnId: 't1', sessionId: 's1', entries: [
                        { id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'write_file', status: 'success', inputSummary: '{"path":"src/a.ts","content":"x"}', falsified: true, falsificationReason: 'declared write produced no diff', createdAt: 100 }
                    ],
                    successCount: 1, errorCount: 0, skippedCount: 0, falsifiedCount: 1, totalDurationMs: 10, createdAt: 100
                }
            },
            {
                id: 't0', sessionId: 's1', createdAt: 0, emptyResponseRetryCount: 0, followUpRecoveryCount: 0,
                followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false,
                compactionCount: 0, totalTokenSavings: 0,
                evidence: {
                    turnId: 't0', sessionId: 's1', entries: [
                        { id: 'e0', turnId: 't0', sessionId: 's1', toolName: 'edit_file', status: 'error', inputSummary: '{"path":"src/b.ts"}', falsified: true, falsificationReason: 'tool failed', createdAt: 50 }
                    ],
                    successCount: 0, errorCount: 1, skippedCount: 0, falsifiedCount: 1, totalDurationMs: 5, createdAt: 50
                }
            }
        ]);
        await store.append('s1', { id: 'u1', role: 'user', content: 'hi', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        const result = await this.call(rpc, 'harness.rejected_actions', { sessionId: 's1' });

        expect(result.actions.length).toEqual(2);
        expect(result.actions[0].toolName).toEqual('write_file');
        expect(result.actions[0].falsificationReason).toContain('no diff');
        expect(result.actions[1].toolName).toEqual('edit_file');
    }

    @Test('harness.rejected_actions returns empty when nothing was falsified')
    async listsNoRejectedActions() {
        const { store, owners, rpc } = await this.createHarness([
            {
                id: 't1', sessionId: 's1', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0,
                followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false,
                compactionCount: 0, totalTokenSavings: 0,
                evidence: {
                    turnId: 't1', sessionId: 's1', entries: [
                        { id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'read_file', status: 'success', inputSummary: 'src/a.ts', falsified: false, createdAt: 100 }
                    ],
                    successCount: 1, errorCount: 0, skippedCount: 0, falsifiedCount: 0, totalDurationMs: 10, createdAt: 100
                }
            }
        ]);
        await store.append('s1', { id: 'u1', role: 'user', content: 'hi', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        const result = await this.call(rpc, 'harness.rejected_actions', { sessionId: 's1' });
        expect(result.actions).toEqual([]);
    }

    @Test('harness.retry_rejected_action re-invokes the tool with the parsed input')
    async retriesRejectedAction() {
        const invoked: { name: string; input: any } = { name: '', input: undefined };
        const { store, owners, rpc } = await this.createHarness([
            {
                id: 't1', sessionId: 's1', createdAt: 1, emptyResponseRetryCount: 0, followUpRecoveryCount: 0,
                followUpContextRewritten: false, finalAssistantWasClarification: false, repeatedClarificationDetected: false,
                compactionCount: 0, totalTokenSavings: 0,
                evidence: {
                    turnId: 't1', sessionId: 's1', entries: [
                        { id: 'e1', turnId: 't1', sessionId: 's1', toolName: 'write_file', status: 'success', inputSummary: '{"path":"src/a.ts","content":"x"}', falsified: true, falsificationReason: 'no diff', createdAt: 100 }
                    ],
                    successCount: 1, errorCount: 0, skippedCount: 0, falsifiedCount: 1, totalDurationMs: 10, createdAt: 100
                }
            }
        ], async (name, input) => {
            invoked.name = name;
            invoked.input = input;
            return { ok: true };
        });
        await store.append('s1', { id: 'u1', role: 'user', content: 'hi', createdAt: 1 } as any);
        await owners.create('s1', 'user-1');

        const result = await this.call(rpc, 'harness.retry_rejected_action', {
            sessionId: 's1', evidenceId: 'e1', toolName: 'write_file'
        });

        expect(result.retried).toEqual(true);
        expect(invoked.name).toEqual('write_file');
        expect(invoked.input).toEqual({ path: 'src/a.ts', content: 'x' });
    }
}
