import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionState } from '../src';

class RuntimeStub {
    messages = [{ id: '1', role: 'assistant', content: 'ready', createdAt: 1 } as any];

    async runTurn(sessionId: string, input: string): Promise<any> {
        this.messages = [
            { id: '1', role: 'user', content: input, createdAt: 1 },
            { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 }
        ] as any;
        return { sessionId, message: this.messages[1] };
    }

    async getMessages(): Promise<any[]> {
        return this.messages;
    }
}

class SchedulerStub {
    async schedule(task: any): Promise<any> {
        return task;
    }

    getTasks(): any[] {
        return [];
    }
}

class FakeToolRegistry {
    calls: Array<{ name: string; input: any; sessionId: string }> = [];
    activations: Array<{ sessionId: string; name: string }> = [];
    active = true;
    result: any = { stdout: 'hello from shell', stderr: '', exitCode: 0, cwd: '/tmp' };
    fail: Error | null = null;
    activateResult = true;

    getTools(): any[] {
        return [{ name: 'terminal', toolset: 'terminal', activation: { kind: 'deferred', activated: this.active } }];
    }

    getTool(name: string): any {
        return name === 'terminal' ? { name } : undefined;
    }

    async invoke(name: string, input: any, sessionId: string): Promise<any> {
        this.calls.push({ name, input, sessionId });
        if (this.fail) {
            throw this.fail;
        }
        return this.result;
    }

    async activateTool(sessionId: string, name: string): Promise<boolean> {
        this.activations.push({ sessionId, name });
        this.active = true;
        return this.activateResult;
    }

    async isToolActive(): Promise<boolean> {
        return this.active;
    }
}

class FakeAppRpc {
    calls: Array<{ method: string; params?: any }> = [];
    output: any = { stdout: 'rpc shell output', stderr: '', exitCode: 0 };
    activated = true;

    async request(method: string, params?: any): Promise<any> {
        this.calls.push({ method, params });
        if (method === 'tools.invoke') {
            if (!this.activated) {
                throw new Error(`Tool 'terminal' is not activated for this session.`);
            }
            return { sessionId: params?.sessionId, name: 'terminal', output: this.output };
        }
        if (method === 'tools.activate') {
            this.activated = true;
            return { activated: true };
        }
        return {};
    }
}

function createShellConsole(toolRegistry?: FakeToolRegistry | null, appRpc?: FakeAppRpc | null): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
    toolRegistry: FakeToolRegistry | null;
    appRpc: FakeAppRpc | null;
} {
    const state = new AgentConsoleSessionState();
    const runtime = new RuntimeStub() as any;
    const bridge = new AgentConsoleEventBridge(state, runtime, toolRegistry as any, appRpc as any, null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: { title: 'Console' } } as any,
        toolRegistry as any,
        appRpc as any
    );
    return { state, component, toolRegistry: toolRegistry ?? null, appRpc: appRpc ?? null };
}

@Suite('shell bang commands')
export class ShellBangCommandTest {

    @Test('!command runs a single shell command through the terminal tool')
    async bangRunsCommand() {
        const registry = new FakeToolRegistry();
        const { state, component } = createShellConsole(registry);

        component.input = '!echo hello';
        await component.submit();

        expect(registry.calls.length).toEqual(1);
        expect(registry.calls[0].name).toEqual('terminal');
        expect(registry.calls[0].input).toEqual({ command: 'echo hello' });
        expect(registry.calls[0].sessionId).toEqual('console');
        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.role).toEqual('tool');
        expect(shellMessage.name).toEqual('terminal');
        expect(shellMessage.metadata?.type).toEqual('shell');
        expect(shellMessage.metadata?.status).toEqual('success');
        expect(shellMessage.content).toContain('$ echo hello');
        expect(shellMessage.content).toContain('hello from shell');
    }

    @Test('!command with empty command shows usage hint without invoking')
    async bangEmptyShowsUsage() {
        const registry = new FakeToolRegistry();
        const { state, component } = createShellConsole(registry);

        component.input = '!';
        await component.submit();

        expect(registry.calls.length).toEqual(0);
        expect(state.notice).toContain('Usage: `!<command>`');
    }

    @Test('!! toggles multiline draft mode and ! alone submits the draft')
    async bangBangMultilineDraft() {
        const registry = new FakeToolRegistry();
        const { state, component } = createShellConsole(registry);

        component.input = '!!';
        await component.submit();
        expect(state.notice).toContain('draft mode');

        component.input = 'ls -la';
        await component.submit();
        expect(registry.calls.length).toEqual(0);
        expect(state.notice).toContain('Shell draft +1');

        component.input = 'pwd';
        await component.submit();
        expect(registry.calls.length).toEqual(0);

        component.input = '!';
        await component.submit();
        expect(registry.calls.length).toEqual(1);
        expect(registry.calls[0].input).toEqual({ command: 'ls -la\npwd' });
        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.type).toEqual('shell');
        expect(shellMessage.content).toContain('$ ls -la\npwd');
    }

    @Test('!! again exits draft mode and discards the draft')
    async bangBangExitsDraftMode() {
        const registry = new FakeToolRegistry();
        const { state, component } = createShellConsole(registry);

        component.input = '!!';
        await component.submit();
        component.input = 'echo draft';
        await component.submit();
        component.input = '!!';
        await component.submit();

        expect(state.notice).toContain('draft discarded');
        expect(registry.calls.length).toEqual(0);

        component.input = '!echo final';
        await component.submit();
        expect(registry.calls.length).toEqual(1);
        expect(registry.calls[0].input).toEqual({ command: 'echo final' });
    }

    @Test('non-zero exit code marks the shell message as failed')
    async bangNonZeroExitCode() {
        const registry = new FakeToolRegistry();
        registry.result = { stdout: '', stderr: 'command not found', exitCode: 127 };
        const { state, component } = createShellConsole(registry);

        component.input = '!bogus';
        await component.submit();

        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.type).toEqual('shell');
        expect(shellMessage.metadata?.status).toEqual('failed');
        expect(shellMessage.metadata?.error).toEqual(true);
        expect(shellMessage.metadata?.exitCode).toEqual(127);
        expect(shellMessage.content).toContain('command not found');
        expect(shellMessage.content).toContain('[exit code: 127]');
    }

    @Test('tool failure surfaces the error in the shell message')
    async bangToolFailure() {
        const registry = new FakeToolRegistry();
        registry.fail = new Error('sandbox denied command');
        const { state, component } = createShellConsole(registry);

        component.input = '!rm -rf /';
        await component.submit();

        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.type).toEqual('shell');
        expect(shellMessage.metadata?.status).toEqual('failed');
        expect(shellMessage.metadata?.error).toEqual(true);
        expect(shellMessage.content).toContain('sandbox denied command');
    }

    @Test('inactive terminal tool is activated before invocation')
    async bangActivatesToolFirst() {
        const registry = new FakeToolRegistry();
        registry.active = false;
        const { state, component } = createShellConsole(registry);

        component.input = '!echo hi';
        await component.submit();

        expect(registry.activations.length).toEqual(1);
        expect(registry.activations[0].name).toEqual('terminal');
        expect(registry.calls.length).toEqual(1);
        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.status).toEqual('success');
    }

    @Test('failed activation reports an error message')
    async bangActivationFailure() {
        const registry = new FakeToolRegistry();
        registry.active = false;
        registry.activateResult = false;
        const { state, component } = createShellConsole(registry);

        component.input = '!echo hi';
        await component.submit();

        expect(registry.calls.length).toEqual(0);
        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.type).toEqual('shell');
        expect(shellMessage.metadata?.status).toEqual('failed');
        expect(shellMessage.content).toContain('not activated');
    }

    @Test('missing tool registry and rpc reports unavailability')
    async bangNoToolSurface() {
        const { state, component } = createShellConsole(null, null);

        component.input = '!echo hi';
        await component.submit();

        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.type).toEqual('shell');
        expect(shellMessage.metadata?.status).toEqual('failed');
        expect(shellMessage.content).toContain('not available');
    }

    @Test('!command goes through appRpc tools.invoke when rpc is available')
    async bangViaAppRpc() {
        const rpc = new FakeAppRpc();
        const { state, component } = createShellConsole(null, rpc);

        component.input = '!echo rpc';
        await component.submit();

        const invokeCall = rpc.calls.find(call => call.method === 'tools.invoke');
        expect(invokeCall).toBeTruthy();
        expect(invokeCall?.params).toEqual({
            sessionId: 'console',
            name: 'terminal',
            input: { command: 'echo rpc' }
        });
        const shellMessage = state.messages[state.messages.length - 1];
        expect(shellMessage.metadata?.status).toEqual('success');
        expect(shellMessage.content).toContain('rpc shell output');
    }

    @Test('shell messages do not enter the model context as user turns')
    async bangDoesNotRunTurn() {
        const runtime = new RuntimeStub();
        const registry = new FakeToolRegistry();
        const state = new AgentConsoleSessionState();
        const bridge = new AgentConsoleEventBridge(state, runtime as any, registry as any, null, null);
        const component = new AgentConsoleComponent(
            state,
            runtime as any,
            new SchedulerStub() as any,
            bridge,
            { ui: { title: 'Console' } } as any,
            registry as any
        );

        component.input = '!echo hi';
        await component.submit();

        expect(registry.calls.length).toEqual(1);
        const roles = state.messages.map(message => message.role);
        expect(roles.every(role => role !== 'user')).toEqual(true);
        expect(roles).toEqual(['tool']);
        expect(state.status).toEqual('idle');
    }
}
