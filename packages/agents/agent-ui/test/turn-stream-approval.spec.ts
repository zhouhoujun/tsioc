import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { consumeStreamEventChunkView } from '../src/AgentConsoleTurnStreamController';

function makeHost(state: AgentConsoleSessionState) {
    const activities: Array<{ kind: string; message: string }> = [];
    return {
        activities,
        host: {
            state: {
                ...state,
                sessionId: 's1',
                upsertPendingApproval: (request: any) => state.upsertPendingApproval(request),
                requestApprovalAttention: () => undefined,
                pushActivity: (kind: any, message: string) => { activities.push({ kind, message }); }
            },
            destroyed: false,
            updateTerminalTitle: () => undefined,
            refreshTodoPlan: async () => undefined,
            refreshPendingApprovals: async () => undefined,
            runtime: {} as any
        } as any
    };
}

function makeState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

@Suite('turn stream approval chunks')
export class TurnStreamApprovalTest {

    @Test('structured approval fields reach the pending request (no content-only degradation)')
    structuredApprovalFields() {
        const state = makeState();
        const { host } = makeHost(state);
        const expiresAt = Date.now() + 30000;
        consumeStreamEventChunkView(host, {
            eventType: 'approval_requested',
            approvalId: 'ap-1',
            toolName: 'terminal',
            reason: 'Tool "terminal" requires approval.',
            summary: 'Tool "terminal" requires approval. Summary: {"command":"ls"}',
            inputSummary: '{"command":"ls"}',
            timeoutMs: 30000,
            expiresAt,
            content: 'Approval required for terminal: Tool "terminal" requires approval. Summary: {"command":"ls"}'
        });

        const pending = state.pendingApprovals[0];
        expect(pending.id).toEqual('ap-1');
        // The panel renders `$ <inputSummary>` and `Reason: <reason>`; falling
        // back to `content` for both printed the same sentence twice.
        expect(pending.inputSummary).toEqual('{"command":"ls"}');
        expect(pending.reason).toEqual('Tool "terminal" requires approval.');
        expect(pending.timeoutMs).toEqual(30000);
        expect(pending.expiresAt).toEqual(expiresAt);
    }

    @Test('a legacy chunk without structured fields still surfaces the request')
    legacyChunkFallsBack() {
        const state = makeState();
        const { host } = makeHost(state);
        consumeStreamEventChunkView(host, {
            eventType: 'approval_requested',
            approvalId: 'ap-2',
            toolName: 'terminal',
            timeoutMs: 15000,
            content: 'Approval required for terminal'
        });

        const pending = state.pendingApprovals[0];
        expect(pending.reason).toEqual('Approval required for terminal');
        expect(pending.timeoutMs).toEqual(15000);
    }

    @Test('a later sparse upsert keeps the richer fields of the same request')
    upsertKeepsRicherFields() {
        const state = makeState();
        const expiresAt = Date.now() + 30000;
        state.upsertPendingApproval({
            id: 'ap-3',
            toolName: 'terminal',
            sessionId: 's1',
            reason: 'Tool "terminal" requires approval.',
            summary: 'summary',
            hasInput: true,
            inputSummary: '{"command":"ls"}',
            createdAt: 1,
            timeoutMs: 30000,
            expiresAt
        } as any);
        state.upsertPendingApproval({
            id: 'ap-3',
            toolName: 'terminal',
            sessionId: 's1',
            reason: 'Approval required for terminal',
            summary: 'Approval required for terminal',
            hasInput: true,
            createdAt: Date.now(),
            timeoutMs: 0,
            expiresAt: 0
        } as any);

        const pending = state.pendingApprovals[0];
        expect(state.pendingApprovals.length).toEqual(1);
        expect(pending.inputSummary).toEqual('{"command":"ls"}');
        expect(pending.reason).toEqual('Tool "terminal" requires approval.');
        expect(pending.timeoutMs).toEqual(30000);
        expect(pending.expiresAt).toEqual(expiresAt);
    }
}
