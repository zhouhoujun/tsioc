import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { createConsole, RuntimeStub, SchedulerStub } from './_helpers';

function conversationWithShell() {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.setMessages([
        { id: 'u1', role: 'user', content: 'hello', createdAt: 1 },
        { id: 'a1', role: 'assistant', content: 'hi', createdAt: 2 },
        {
            id: 'shell-1',
            role: 'tool',
            name: 'terminal',
            content: 'echo hi\n\nhi',
            createdAt: 3,
            metadata: { type: 'shell', status: 'success' }
        },
        {
            id: 'tool-1',
            role: 'tool',
            name: 'read_file',
            content: 'file body',
            createdAt: 4,
            metadata: { status: 'success' }
        }
    ] as any);
    return state;
}

@Suite('!shell commands stay visible and run through the gateway')
export class ShellBangDisplayTest {

    @Test('the local shell row is part of the transcript')
    async shellMessageIsDisplayed() {
        const state = conversationWithShell();
        const ids = state.displayMessages.map(message => message.id);
        expect(ids).toContain('u1');
        expect(ids).toContain('a1');
        expect(ids).toContain('shell-1');
        // execution rows sit between the request and the answer
        expect(ids.indexOf('shell-1')).toBeGreaterThan(ids.indexOf('u1'));
        expect(ids.indexOf('shell-1')).toBeLessThan(ids.indexOf('a1'));
        // the row keeps the command and its output instead of collapsing to
        // `<command> completed`
        const shell = state.displayMessages.find(message => message.id === 'shell-1');
        expect(shell?.content).toContain('echo hi');
        expect(shell?.content).toContain('hi');
    }

    @Test('regular tool messages stay out of the transcript')
    async plainToolMessageStaysHidden() {
        const state = conversationWithShell();
        expect(state.displayMessages.some(message => message.id === 'tool-1')).toEqual(false);
    }

    @Test('!cmd activates the terminal tool before invoking it over app rpc')
    async activatesBeforeInvoke() {
        const calls: Array<{ method: string; params: any }> = [];
        const appRpc = {
            request: async (method: string, params: any) => {
                calls.push({ method, params });
                return method === 'tools.invoke' ? { output: { stdout: 'hi', exitCode: 0 } } : {};
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
            appRpc as any
        );
        component.sessionState.setWorkspace('/ws/custom');
        const output = await (component as any).invokeTerminalTool('echo hi');
        expect(output).toEqual({ stdout: 'hi', exitCode: 0 });
        expect(calls.map(call => call.method)).toEqual(['tools.activate', 'tools.invoke']);
        expect(calls[0].params).toEqual({ sessionId: component.sessionState.sessionId, name: 'terminal' });
        expect(calls[1].params.workspace).toEqual('/ws/custom');
        expect(calls[1].params.input).toEqual({ command: 'echo hi' });
    }
}
