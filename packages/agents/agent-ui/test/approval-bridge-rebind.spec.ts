import { AgentApprovalRequestedEvent, InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleEventBridge, AgentConsoleSessionState } from '../src';
import { ApplicationContextStub, RuntimeStub, ToolRegistryStub } from './_helpers';

function makeState(sessionId: string): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.sessionId = sessionId;
    return state;
}

function approvalRequest(sessionId: string, id = 'approval-1') {
    return {
        id,
        toolName: 'web_search',
        sessionId,
        reason: 'Network tools require approval.',
        summary: 'Network tools require approval.',
        hasInput: true,
        inputSummary: '{"query":"node 22"}',
        timeoutMs: 30000
    };
}

/**
 * Regression for `eab06f8fd`: the local event bindings captured `state` when
 * they were constructed, but the bridge can be re-bound (`bindState`) to the
 * component's reactive proxy after the first `subscribe()`. A captured raw
 * instance swallowed every approval write, so the dialog never rendered and
 * the request timed out after 30s.
 */
@Suite('console event bridge state rebinding')
export class ApprovalBridgeRebindTest {

    @Test('approval events follow the state bound after subscribe')
    async approvalFollowsReboundState() {
        const app = new ApplicationContextStub();
        const runtime = new RuntimeStub();
        const bridge = new AgentConsoleEventBridge(
            makeState('initial-session'),
            runtime as any,
            new ToolRegistryStub() as any,
            null,
            app as any
        );
        bridge.subscribe();

        const bound = makeState('rebound-session');
        bridge.bindState(bound);

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, approvalRequest('rebound-session')));

        expect(bound.pendingApprovals.length).toEqual(1);
        expect(bound.pendingApprovals[0].toolName).toEqual('web_search');
        expect(bound.approvalsFocused).toEqual(true);

        await app.eventMulticaster.emit(new AgentApprovalRequestedEvent(this, approvalRequest('initial-session', 'approval-stale')));

        expect(bound.pendingApprovals.length).toEqual(1);
        expect(bound.pendingApprovals[0].id).toEqual('approval-1');
    }
}
