import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

function assistantMessage() {
    return { id: 'a1', role: 'assistant', content: '', createdAt: 1, metadata: { streaming: true } } as any;
}

@Suite('the console workspace travels with the turn')
export class WorkspacePropagationTest {

    @Test('the streaming RPC request carries the active workspace')
    async streamRequestCarriesWorkspace() {
        const calls: Array<{ method: string; params: any }> = [];
        const appRpc: any = {
            stream: (method: string, params: any) => {
                calls.push({ method, params });
                return (async function* () {
                    yield { type: 'text', content: 'ok' };
                    yield { type: 'done' };
                })();
            }
        };
        const component = createConsole(
            new RuntimeStub(),
            new SchedulerStub(),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            appRpc
        );
        component.sessionState.setWorkspace('/ws/custom');
        await (component as any).runTurnStream('hello', assistantMessage());
        expect(calls.length).toEqual(1);
        expect(calls[0].method).toEqual('run.turn_stream');
        expect(calls[0].params.workspace).toEqual('/ws/custom');
    }

    @Test('the in-process runtime receives the active workspace as well')
    async inProcessTurnCarriesWorkspace() {
        const seen: Array<string | undefined> = [];
        class CapturingRuntime extends RuntimeStub {
            async *runStreamingTurn(sessionId: string, input: string, _principalId?: string, _message?: any, _profile?: string, _agent?: any, workspace?: string): AsyncGenerator<any> {
                seen.push(workspace);
                yield { type: 'text', content: 'ok' };
                yield { type: 'done' };
            }
        }
        const component = createConsole(new CapturingRuntime(), new SchedulerStub());
        component.sessionState.setWorkspace('/ws/other');
        await (component as any).runTurnStream('hello', assistantMessage());
        expect(seen).toEqual(['/ws/other']);
    }

    @Test('a fresh session state starts without a workspace override')
    async emptyWorkspaceStaysUndefined() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.workspace).toEqual('');
    }
}
