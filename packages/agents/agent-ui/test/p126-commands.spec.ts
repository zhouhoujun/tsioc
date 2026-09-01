import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';
import { AGENT_PERSONALITY_PRESETS } from '@tsdi/agent';
import { VscodeIdeBridge } from '../src/AgentIdeBridge';

class RuntimeStub {
    async runTurn(sessionId: string, input: string): Promise<any> {
        return { sessionId, message: { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 } };
    }

    async getMessages(): Promise<any[]> {
        return [];
    }

    getHookSummary(): Array<{ stage: string; commands: string[]; functions: string[] }> {
        return [
            { stage: 'beforeTurn', commands: ['echo hi'], functions: ['validateInput'] },
            { stage: 'afterTool', commands: [], functions: ['auditToolCall'] }
        ];
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

class FakeAppRpc {
    async request(method: string, params?: any): Promise<any> {
        switch (method) {
            case 'session.messages':
                return { messages: [], sections: [], nextCursor: undefined, hasMore: false };
            case 'tools.list':
                return [];
            default:
                return {};
        }
    }
}

function createConsole(options?: any, extras?: { backgroundTasks?: any; ideBridge?: any }): {
    state: AgentConsoleSessionState;
    component: AgentConsoleComponent;
} {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(rpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc as any, null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: { title: 'Console' }, ...options } as any,
        null,
        rpc as any,
        sessionService,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        extras?.backgroundTasks ?? null,
        extras?.ideBridge ?? null
    );
    return { state, component };
}

@Suite('P126 command cluster')
export class P126CommandClusterTest {

    @Test('/hooks lists registered lifecycle hooks')
    async hooksListsStages() {
        const { state, component } = createConsole();
        const result = await (component as any).handleCommand('/hooks');
        expect(result).toEqual(true);
        expect(state.notice).toContain('beforeTurn');
        expect(state.notice).toContain('afterTool');
        expect(state.notice).toContain('echo hi');
        expect(state.notice).toContain('auditToolCall');
    }

    @Test('/hooks reports none when no hooks are registered')
    async hooksNone() {
        const { state, component } = createConsole();
        (component as any).runtime.getHookSummary = () => [];
        const result = await (component as any).handleCommand('/hooks');
        expect(result).toEqual(true);
        expect(state.notice).toContain('No hooks registered');
    }

    @Test('/memories toggles memory injection on the shared options object')
    async memoriesToggle() {
        const { state, component } = createConsole();
        const result = await (component as any).handleCommand('/memories');
        expect(result).toEqual(true);
        expect(state.notice).toContain('Memory injection ON');

        await (component as any).handleCommand('/memories off');
        expect((component as any).options.ui.memoryInjection).toEqual(false);
        expect(state.notice).toContain('Memory injection disabled');

        await (component as any).handleCommand('/memories on');
        expect((component as any).options.ui.memoryInjection).toEqual(true);
    }

    @Test('/memories rejects invalid arguments')
    async memoriesInvalid() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/memories maybe');
        expect(state.notice).toContain('Usage: /memories');
    }

    @Test('/memories manages project records and lists injected memory')
    async memoriesManagement() {
        const { state, component } = createConsole({ ui: { title: 'Console', console: { workspace: '/work/alpha' } } });
        const records: any[] = [];
        (component as any).appRpc = null;
        (component as any).projectMemory = {
            add: async (input: any) => {
                const record = { id: 'm1', key: input.key, value: input.value };
                records.push(record);
                return record;
            },
            list: async () => records,
            remove: async (_project: string, target: string) => {
                const index = records.findIndex(item => item.id === target || item.key === target);
                if (index < 0) return 0;
                records.splice(index, 1);
                return 1;
            }
        };
        await (component as any).handleCommand('/memories add language=TypeScript');
        expect(state.notice).toContain('saved: language');
        await (component as any).handleCommand('/memories list');
        expect(state.notice).toContain('language: TypeScript');
        await (component as any).handleCommand('/memories remove language');
        expect(state.notice).toContain('Removed 1');
    }

    @Test('/fast activates the fast profile and toggles back to strong')
    async fastTogglesProfile() {
        const { state, component } = createConsole({
            model: {
                profiles: { fast: { provider: 'deepseek', model: 'fast-model' }, strong: { provider: 'deepseek', model: 'strong-model' } }
            }
        });
        const activated: string[] = [];
        (component as any).activateModelProfile = async (name: string) => { activated.push(name); };

        await (component as any).handleCommand('/fast');
        expect(activated).toEqual(['fast']);

        (component as any).state.modelProfile = 'fast';
        await (component as any).handleCommand('/fast');
        expect(activated[1]).toEqual('strong');
    }

    @Test('/fast reports unknown profiles')
    async fastUnknown() {
        const { state, component } = createConsole({ model: { profiles: { fast: {} } } });
        await (component as any).handleCommand('/fast bogus');
        expect(state.notice).toContain('Unknown model profile "bogus"');
    }

    @Test('/personality lists presets, sets one, and unsets')
    async personalityLifecycle() {
        const { state, component } = createConsole();
        const result = await (component as any).handleCommand('/personality');
        expect(result).toEqual(true);
        expect(state.notice).toContain('Personality: none');
        expect(state.notice).toContain(Object.keys(AGENT_PERSONALITY_PRESETS).join(', '));

        await (component as any).handleCommand('/personality set concise');
        expect((component as any).options.ui.personality).toEqual('concise');
        expect(state.notice).toContain('Personality set to concise.');

        await (component as any).handleCommand('/personality unset');
        expect((component as any).options.ui.personality).toBeUndefined();
        expect(state.notice).toContain('Personality cleared.');
    }

    @Test('/personality rejects unknown presets')
    async personalityUnknown() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/personality set nonexistent');
        expect(state.notice).toContain('Unknown personality preset "nonexistent"');
    }

    @Test('/debug-config prints resolved model, profile, and ui options')
    async debugConfigPrintsResolvedState() {
        const { state, component } = createConsole({
            model: { provider: 'deepseek', model: 'deepseek-v4-flash', defaultProfile: 'fast', profiles: { fast: {}, strong: {} } },
            ui: { title: 'Console', statusline: ['model', 'workspace'], memoryInjection: true }
        });
        state.setWorkspace('/work/demo');
        const result = await (component as any).handleCommand('/debug-config');
        expect(result).toEqual(true);
        expect(state.notice).toContain('model: deepseek / deepseek-v4-flash');
        expect(state.notice).toContain('profile: fast');
        expect(state.notice).toContain('ui.statusline: model, workspace');
        expect(state.notice).toContain('workspace: /work/demo');
    }

    @Test('/experimental lists, enables, and disables feature switches')
    async experimentalLifecycle() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/experimental streaming on');
        expect((component as any).options.ui.experimental).toEqual({ streaming: true });
        expect(state.notice).toContain('"streaming" enabled');

        await (component as any).handleCommand('/experimental');
        expect(state.notice).toContain('on streaming');

        await (component as any).handleCommand('/experimental streaming off');
        expect((component as any).options.ui.experimental).toEqual({ streaming: false });
    }

    @Test('/experimental rejects missing state')
    async experimentalInvalid() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/experimental streaming');
        expect(state.notice).toContain('Usage: /experimental');
    }

    @Test('/feedback prints packaging diagnostics hints')
    async feedbackPrintsHints() {
        const { state, component } = createConsole();
        const result = await (component as any).handleCommand('/feedback');
        expect(result).toEqual(true);
        expect(state.notice).toContain('/debug-config');
        expect(state.notice).toContain('session transcript');
    }

    @Test('/ps lists and stops background tasks when the manager is present')
    async psWithManager() {
        const tasks = {
            list: () => [
                { id: 'bg-1', sessionId: 'active-1', status: 'completed', goal: 'fix the build', startedAt: 1, finishedAt: 2 },
                { id: 'bg-2', sessionId: 'other-session', status: 'running', goal: 'other task', startedAt: 3 }
            ],
            cancel: (id: string) => id === 'bg-running'
        };
        const { state, component } = createConsole(undefined, { backgroundTasks: tasks });

        await (component as any).handleCommand('/ps');
        expect(state.notice).toContain('bg-1');
        expect(state.notice).toContain('fix the build');
        expect(state.notice).not.toContain('other-session');

        await (component as any).handleCommand('/ps stop bg-x');
        expect(state.notice).toContain('Cancelled 0/1 background task(s)');
        expect(state.notice).toContain('✗ bg-x - not running');
    }

    @Test('/ps reports when the manager is unavailable')
    async psWithoutManager() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/ps');
        expect(state.notice).toContain('not available');
    }

    @Test('/ide reports when no bridge is attached')
    async ideNoBridge() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/ide');
        expect(state.notice).toContain('No IDE bridge');
    }

    @Test('/ide shows active file context from the bridge')
    async ideWithBridge() {
        const bridge = new VscodeIdeBridge(null);
        (bridge as any).context = {
            activeFile: '/work/demo/src/main.ts',
            selection: { startLine: 4, endLine: 9 },
            platform: 'vscode'
        };
        const { state, component } = createConsole(undefined, { ideBridge: bridge });
        await (component as any).handleCommand('/ide');
        expect(state.notice).toContain('IDE context: /work/demo/src/main.ts lines 4-9 (vscode)');
    }

    @Test('VscodeIdeBridge captures host messages')
    async vscodeBridgeCapturesMessages() {
        const listeners: Array<(event: any) => unknown> = [];
        const bridge = new VscodeIdeBridge({ addEventListener: (_type, listener) => listeners.push(listener) });
        listeners[0]({ data: { type: 'tsdiAgent.ideContext', activeFile: '/a/b.ts', selection: { startLine: 1, endLine: 2 } } });
        const context = await bridge.getContext();
        expect(context?.activeFile).toEqual('/a/b.ts');
        expect(context?.selection?.startLine).toEqual(1);
        expect(context?.platform).toEqual('vscode');
    }
}
