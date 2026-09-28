import { selectFirstMessage } from '../src/AgentConsoleTranscriptNavigation';
import { InMemoryCommandExecutionControl } from "@tsdi/agent";
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    AgentConsoleKeymap,
    AgentConsoleKeymapStore,
    AgentConsoleModelStore,
    AgentConsoleWhichKeyPanelComponent,
    AGENT_CONSOLE_PAGER_DEFAULT_KEYMAP,
    AGENT_CONSOLE_COMPOSER_DEFAULT_KEYMAP,
    isAgentConsoleGlobalAction
} from '../src';

class RuntimeStub {
    async runTurn(sessionId: string, input: string): Promise<any> {
        return { sessionId, message: { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 } };
    }

    async getMessages(): Promise<any[]> {
        return [];
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

class DelegationFakeRpc extends FakeAppRpc {
    children: Array<Record<string, any>> = [];
    lineage: Array<Record<string, any>> = [];

    async request(method: string, params?: any): Promise<any> {
        if (method === 'delegation.children') {
            return { children: this.children };
        }
        if (method === 'delegation.lineage') {
            return { lineage: this.lineage };
        }
        return super.request(method, params);
    }
}

class RecordingRpc extends FakeAppRpc {
    calls: Array<{ method: string; params?: any }> = [];

    async request(method: string, params?: any): Promise<any> {
        this.calls.push({ method, params });
        if (method === 'model.activate') {
            return { reasoningEffort: 'high' };
        }
        return super.request(method, params);
    }
}

class MemoryFileAdapter {
    files: Record<string, string> = {};

    join(...targets: string[]): string {
        return targets.join('/');
    }

    async mkdir(_directory: string, _options?: any): Promise<void> {
        return;
    }

    async writeText(target: string, content: string): Promise<void> {
        this.files[target] = content;
    }

    async readText(target: string): Promise<string> {
        return this.files[target];
    }
}

function createKeymapConsoleParts(
    agentOptions?: any,
    keymapStore?: AgentConsoleKeymapStore,
    workspace?: string,
    rpc?: any,
    modelStore?: AgentConsoleModelStore,
    surfaceAccessor?: any
): { state: AgentConsoleSessionState; component: AgentConsoleComponent } {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'active-1', ...(workspace ? { workspace } : {}) } as any);
    const runtime = new RuntimeStub() as any;
    const appRpc = rpc || new FakeAppRpc();
    const sessionService = new AgentConsoleSessionService(appRpc as any, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, appRpc as any, null);
    const component = new AgentConsoleComponent(
        state,
        runtime,
        new SchedulerStub() as any,
        bridge,
        { ui: agentOptions || {} } as any,
        null,
        appRpc as any,
        sessionService,
        undefined,
        undefined,
        undefined,
        undefined,
        surfaceAccessor,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        keymapStore as any,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        modelStore as any
    );
    return { state, component };
}

@Suite('context-scoped keymap (P133)')
export class AgentConsoleKeymapContextTest {

    @Test('context overrides take priority over global overrides and defaults')
    async contextOverridesTakePriority() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('ctrl+x s', 'composer')).toEqual('status');
        expect(keymap.resolve('ctrl+g', 'composer')).toEqual('open-editor');
        keymap.set('ctrl+g', 'sessions', 'composer');
        expect(keymap.resolve('ctrl+g', 'composer')).toEqual('sessions');
        expect(keymap.resolve('ctrl+g', 'global')).toEqual('open-editor');
        keymap.set('ctrl+g', 'theme', 'global');
        expect(keymap.resolve('ctrl+g', 'global')).toEqual('theme');
        expect(keymap.resolve('ctrl+g', 'composer')).toEqual('sessions');
        expect(keymap.resolve('ctrl+g', 'list')).toEqual('theme');
    }

    @Test('unset nulls the binding only in the given context')
    async unsetScopedToContext() {
        const keymap = new AgentConsoleKeymap();
        keymap.set('ctrl+p', 'sessions', 'composer');
        expect(keymap.resolve('ctrl+p', 'composer')).toEqual('sessions');
        expect(keymap.unset('ctrl+p', 'composer')).toEqual(true);
        expect(keymap.resolve('ctrl+p', 'composer')).toEqual(undefined);
        expect(keymap.resolve('ctrl+p', 'global')).toEqual('command-palette');
        expect(keymap.unset('ctrl+p', 'list')).toEqual(true);
        expect(keymap.resolve('ctrl+p', 'list')).toEqual(undefined);
        expect(keymap.resolve('ctrl+p', 'global')).toEqual('command-palette');
        expect(keymap.unset('ctrl+p', 'global')).toEqual(true);
        expect(keymap.resolve('ctrl+p', 'global')).toEqual(undefined);
    }

    @Test('reset with a context only clears that context; reset() clears everything')
    async resetScopedToContext() {
        const keymap = new AgentConsoleKeymap();
        keymap.set('ctrl+p', 'sessions', 'composer');
        keymap.set('ctrl+g', 'theme', 'global');
        keymap.reset('composer');
        expect(keymap.resolve('ctrl+p', 'composer')).toEqual('command-palette');
        expect(keymap.resolve('ctrl+g', 'composer')).toEqual('theme');
        keymap.reset('global');
        expect(keymap.resolve('ctrl+g', 'global')).toEqual('open-editor');
        keymap.set('ctrl+g', 'theme', 'composer');
        keymap.reset();
        expect(keymap.resolve('ctrl+g', 'composer')).toEqual('open-editor');
    }

    @Test('conflicts reports other contexts resolving the same key differently')
    async conflictsAcrossContexts() {
        const keymap = new AgentConsoleKeymap();
        keymap.set('ctrl+p', 'sessions', 'composer');
        const conflicts = keymap.conflicts('ctrl+p', 'sessions', 'composer');
        expect(conflicts.some(({ context, action }) => context === 'global' && action === 'command-palette')).toEqual(true);
        expect(conflicts.every(({ context }) => context !== 'composer')).toEqual(true);
        keymap.set('ctrl+p', 'sessions', 'global');
        expect(keymap.conflicts('ctrl+p', 'sessions', 'composer')).toEqual([]);
    }

    @Test('effectiveBindings and customBindingsFor expose per-context views')
    async perContextViews() {
        const keymap = new AgentConsoleKeymap();
        keymap.set('ctrl+g', 'sessions', 'composer');
        expect(keymap.customBindingsFor('composer')).toEqual({ 'ctrl+g': 'sessions' });
        expect(keymap.customBindingsFor('global')).toEqual({});
        expect(keymap.effectiveBindings('composer')['ctrl+g']).toEqual('sessions');
        expect(keymap.effectiveBindings('composer')['ctrl+x s']).toEqual('status');
        expect(keymap.effectiveBindings('global')['ctrl+g']).toEqual('open-editor');
    }

    @Test('store v2 round-trips contexts and keeps load backward-compatible')
    async storeV2RoundTrip() {
        const store = new AgentConsoleKeymapStore(new MemoryFileAdapter() as any);
        await store.save('ws', { 'ctrl+g': 'sessions' }, { composer: { 'ctrl+p': 'theme' } });
        expect(await store.load('ws')).toEqual({ 'ctrl+g': 'sessions' });
        expect(await store.loadContexts('ws')).toEqual({ composer: { 'ctrl+p': 'theme' } });
    }

    @Test('store loadContexts returns empty for v1 files and filters unknown contexts')
    async storeV1Compat() {
        const adapter = new MemoryFileAdapter();
        adapter.files['ws/.tsdi-agent/keymap.json'] = JSON.stringify({
            version: 1,
            bindings: { 'ctrl+g': 'sessions' }
        });
        const store = new AgentConsoleKeymapStore(adapter as any);
        expect(await store.load('ws')).toEqual({ 'ctrl+g': 'sessions' });
        expect(await store.loadContexts('ws')).toEqual({});

        adapter.files['ws/.tsdi-agent/keymap.json'] = JSON.stringify({
            version: 2,
            bindings: {},
            contexts: { composer: { 'ctrl+p': 'theme' }, bogus: { 'ctrl+q': 'export' } }
        });
        expect(await store.loadContexts('ws')).toEqual({ composer: { 'ctrl+p': 'theme' } });
    }

    @Test('/keymap composer set binds in that context and reports cross-context conflicts')
    async keymapCommandContextSetConflicts() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleCommand('/keymap composer set ctrl+p theme');
        expect((component as any).globalKeymap.resolve('ctrl+p', 'composer')).toEqual('theme');
        expect((component as any).globalKeymap.resolve('ctrl+p', 'global')).toEqual('command-palette');
        expect(state.notice).toContain('Keymap set: ctrl+p -> theme');
        expect(state.notice).toContain('conflicts with');
    }

    @Test('/keymap record captures the next key into the given context')
    async keymapRecordCapturesNextKey() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleCommand('/keymap composer record theme');
        expect(state.notice).toContain('Recording key');
        await (component as any).handleGlobalKeyInput('\u0010');
        expect((component as any).globalKeymap.resolve('ctrl+p', 'composer')).toEqual('theme');
        expect((component as any).globalKeymap.resolve('ctrl+p', 'global')).toEqual('command-palette');
        expect(state.notice).toContain('Keymap set: ctrl+p -> theme (composer)');
    }

    @Test('escape during keymap recording cancels without binding')
    async keymapRecordEscapeCancels() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleCommand('/keymap composer record theme');
        await (component as any).handleGlobalKeyInput('\u001b');
        expect(state.notice).toContain('recording cancelled');
        expect((component as any).globalKeymap.resolve('ctrl+p', 'composer')).toEqual('command-palette');
        expect((component as any).globalKeymap.resolve('ctrl+p', 'global')).toEqual('command-palette');
    }

    @Test('/keymap composer set persists context bindings through the store')
    async keymapCommandPersistsContextBindings() {
        const adapter = new MemoryFileAdapter();
        const store = new AgentConsoleKeymapStore(adapter as any);
        const { component } = createKeymapConsoleParts(undefined, store, 'ws');
        await (component as any).handleCommand('/keymap composer set ctrl+p theme');
        expect(await store.loadContexts('ws')).toEqual({ composer: { 'ctrl+p': 'theme' } });
        expect(await store.load('ws')).toEqual({});
    }

    @Test('resolveKeymapContext maps focus flags to keymap contexts')
    async resolveKeymapContextMapsFocus() {
        const { state, component } = createKeymapConsoleParts();
        state.setApprovalsFocused(true);
        expect((component as any).resolveKeymapContext()).toEqual('approval');
        state.setApprovalsFocused(false);
        state.setMessagesFocused(true);
        expect((component as any).resolveKeymapContext()).toEqual('pager');
        state.setMessagesFocused(false);
        state.setMessages([{ id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any]);
        state.openMessageDetail();
        expect((component as any).resolveKeymapContext()).toEqual('pager');
        state.closeMessageDetail();
        state.setSessionsFocused(true);
        expect((component as any).resolveKeymapContext()).toEqual('list');
        state.setSessionsFocused(false);
        state.setTasksFocused(true);
        expect((component as any).resolveKeymapContext()).toEqual('list');
        state.setTasksFocused(false);
        state.setJobsFocused(true);
        expect((component as any).resolveKeymapContext()).toEqual('list');
        state.setJobsFocused(false);
        state.setToolsFocused(true);
        expect((component as any).resolveKeymapContext()).toEqual('list');
        state.setToolsFocused(false);
        expect((component as any).resolveKeymapContext()).toEqual('composer');
        state.setInputFocused(false);
        expect((component as any).resolveKeymapContext()).toEqual('global');
    }
}

@Suite('thread navigation keymap (P134)')
export class AgentConsoleThreadNavigationTest {
    @Test('pager context resolves arrow keys to thread navigation actions by default')
    async pagerDefaultsResolveThreadActions() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('down', 'pager')).toEqual('thread-child-first');
        expect(keymap.resolve('up', 'pager')).toEqual('thread-parent');
        expect(keymap.resolve('right', 'pager')).toEqual('thread-cycle-next');
        expect(keymap.resolve('left', 'pager')).toEqual('thread-cycle-prev');
    }

    @Test('thread navigation defaults are scoped to the pager context')
    async threadDefaultsScopedToPager() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('down', 'global')).toEqual(undefined);
        expect(keymap.resolve('up', 'composer')).toEqual(undefined);
        expect(keymap.resolve('right', 'list')).toEqual(undefined);
        expect(keymap.resolve('left', 'approval')).toEqual(undefined);
        expect(keymap.effectiveBindings('pager').down).toEqual('thread-child-first');
        expect(keymap.effectiveBindings('global').down).toEqual(undefined);
    }

    @Test('user pager overrides beat the pager defaults')
    async pagerOverrideBeatsDefault() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.set('down', 'copy', 'pager')).toEqual(true);
        expect(keymap.resolve('down', 'pager')).toEqual('copy');
        expect(keymap.resolve('up', 'pager')).toEqual('thread-parent');
        keymap.unset('down', 'pager');
        expect(keymap.resolve('down', 'pager')).toEqual(undefined);
    }

    @Test('down arrow in pager opens the first child thread')
    async downArrowOpensFirstChild() {
        const rpc = new DelegationFakeRpc();
        rpc.children = [{ id: 'e1', parentSessionId: 'active-1', childSessionId: 'child-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setMessagesFocused(true);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        const consumed = await (component as any).handleGlobalKeyInput('\u001b[B');
        expect(consumed).toEqual(true);
        expect(opened).toEqual(['child-1']);
    }

    @Test('up arrow in pager opens the parent thread')
    async upArrowOpensParent() {
        const rpc = new DelegationFakeRpc();
        rpc.lineage = [{ id: 'e0', parentSessionId: 'parent-1', childSessionId: 'active-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setMessagesFocused(true);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        const consumed = await (component as any).handleGlobalKeyInput('\u001b[A');
        expect(consumed).toEqual(true);
        expect(opened).toEqual(['parent-1']);
    }

    @Test('right arrow cycles to the next sibling; left wraps to the previous')
    async arrowsCycleSiblings() {
        const rpc = new DelegationFakeRpc();
        rpc.lineage = [{ id: 'e0', parentSessionId: 'parent-1', childSessionId: 'active-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        rpc.children = [
            { id: 'e1', parentSessionId: 'parent-1', childSessionId: 'active-1', kind: 'delegate', status: 'completed', createdAt: 1 },
            { id: 'e2', parentSessionId: 'parent-1', childSessionId: 'sib-2', kind: 'delegate', status: 'completed', createdAt: 2 },
            { id: 'e3', parentSessionId: 'parent-1', childSessionId: 'sib-3', kind: 'delegate', status: 'completed', createdAt: 3 }
        ];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setMessagesFocused(true);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => {
            opened.push(String(sessionId));
            if (sessionId) (state as any).sessionId = String(sessionId);
        };
        expect(await (component as any).handleGlobalKeyInput('\u001b[C')).toEqual(true);
        expect(opened).toEqual(['sib-2']);
        expect(await (component as any).handleGlobalKeyInput('\u001b[D')).toEqual(true);
        expect(opened).toEqual(['sib-2', 'active-1']);
        expect(await (component as any).handleGlobalKeyInput('\u001b[D')).toEqual(true);
        expect(opened).toEqual(['sib-2', 'active-1', 'sib-3']);
    }

    @Test('cycle needs at least two siblings; single sibling falls through')
    async cycleRequiresSiblings() {
        const rpc = new DelegationFakeRpc();
        rpc.lineage = [{ id: 'e0', parentSessionId: 'parent-1', childSessionId: 'active-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        rpc.children = [{ id: 'e1', parentSessionId: 'parent-1', childSessionId: 'active-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setMessagesFocused(true);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        expect(await (component as any).handleGlobalKeyInput('\u001b[C')).toEqual(false);
        expect(opened).toEqual([]);
    }

    @Test('arrows fall through to message selection when no delegation data exists')
    async arrowsFallThroughWithoutDelegation() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessagesFocused(true);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        expect(await (component as any).handleGlobalKeyInput('\u001b[B')).toEqual(false);
        expect(await (component as any).handleGlobalKeyInput('\u001b[A')).toEqual(false);
        expect(opened).toEqual([]);
    }

    @Test('thread navigation is gated without message focus')
    async threadNavGatedWithoutMessageFocus() {
        const rpc = new DelegationFakeRpc();
        rpc.children = [{ id: 'e1', parentSessionId: 'active-1', childSessionId: 'child-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        expect(await (component as any).handleGlobalKeyInput('\u001b[B')).toEqual(false);
        expect(opened).toEqual([]);
    }

    @Test('thread navigation is gated while message detail is open')
    async threadNavGatedWhileDetailOpen() {
        const rpc = new DelegationFakeRpc();
        rpc.children = [{ id: 'e1', parentSessionId: 'active-1', childSessionId: 'child-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setMessages([{ id: 'm1', role: 'assistant', content: 'hello', createdAt: 1 } as any]);
        state.setMessagesFocused(true);
        state.setSelectedMessageId('m1');
        state.openMessageDetail();
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        expect(await (component as any).handleGlobalKeyInput('\u001b[B')).toEqual(false);
        expect(opened).toEqual([]);
    }

    @Test('browser ArrowDown in pager opens the first child thread')
    async browserArrowDownOpensFirstChild() {
        const rpc = new DelegationFakeRpc();
        rpc.children = [{ id: 'e1', parentSessionId: 'active-1', childSessionId: 'child-1', kind: 'delegate', status: 'completed', createdAt: 1 }];
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setMessagesFocused(true);
        const opened: string[] = [];
        (component as any).openSession = async (sessionId?: string) => { opened.push(String(sessionId)); };
        const consumed = await (component as any).handleBrowserGlobalKeyInput('ArrowDown', {});
        expect(consumed).toEqual(true);
        expect(opened).toEqual(['child-1']);
    }

    @Test('pager defaults resolve message navigation actions')
    pagerDefaultsResolveMessageNavigationActions() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('pageup', 'pager')).toEqual('message-page-up');
        expect(keymap.resolve('pagedown', 'pager')).toEqual('message-page-down');
        expect(keymap.resolve('home', 'pager')).toEqual('message-first');
        expect(keymap.resolve('end', 'pager')).toEqual('message-last');
        expect(keymap.resolve('shift+g', 'pager')).toEqual('message-last-user');
    }

    @Test('message navigation defaults are scoped to the pager context')
    messageNavScopedToPager() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('pageup', 'global')).toEqual(undefined);
        expect(keymap.resolve('pageup', 'composer')).toEqual('message-page-up');
        expect(keymap.resolve('home', 'global')).toEqual(undefined);
        expect(keymap.resolve('end', 'list')).toEqual(undefined);
        expect(keymap.effectiveBindings('pager').pageup).toEqual('message-page-up');
        expect(keymap.effectiveBindings('global').pageup).toEqual(undefined);
    }

    @Test('user pager overrides beat the message navigation defaults')
    messageNavOverrideBeatsDefault() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.set('pageup', 'copy', 'pager')).toEqual(true);
        expect(keymap.resolve('pageup', 'pager')).toEqual('copy');
        expect(keymap.resolve('end', 'pager')).toEqual('message-last');
        keymap.unset('pageup', 'pager');
        expect(keymap.resolve('pageup', 'pager')).toEqual(undefined);
    }

    @Test('pageup in pager moves the message selection up by a page')
    async pageUpMovesSelectionByPage() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any,
            { id: 'm7', role: 'user', content: '7', createdAt: 7 } as any,
            { id: 'm8', role: 'assistant', content: '8', createdAt: 8 } as any
        ]);
        state.setMessagesFocused(true);
        const consumed = await (component as any).handleGlobalKeyInput('\u001b[5~');
        expect(consumed).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m2');
    }

    @Test('pagedown in pager moves the message selection down by a page')
    async pageDownMovesSelectionByPage() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any,
            { id: 'm7', role: 'user', content: '7', createdAt: 7 } as any,
            { id: 'm8', role: 'assistant', content: '8', createdAt: 8 } as any
        ]);
        state.setMessagesFocused(true);
        selectFirstMessage(state);
        const consumed = await (component as any).handleGlobalKeyInput('\u001b[6~');
        expect(consumed).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m7');
    }

    @Test('home in pager selects the first message; end selects the last')
    async homeAndEndSelectEdges() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any
        ]);
        state.setMessagesFocused(true);
        expect(await (component as any).handleGlobalKeyInput('\u001b[H')).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m1');
        expect(await (component as any).handleGlobalKeyInput('\u001b[F')).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m3');
    }

    @Test('shift+g in pager selects the last user message')
    async shiftGSelectsLastUserMessage() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any
        ]);
        state.setMessagesFocused(true);
        expect(await (component as any).handleGlobalKeyInput('G')).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m5');
    }

    @Test('last-user selection skips steer messages')
    async lastUserSkipsSteerMessages() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: 'steer payload', createdAt: 3, metadata: { kind: 'steer' } } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any
        ]);
        state.setMessagesFocused(true);
        expect(await (component as any).handleGlobalKeyInput('G')).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m1');
    }

    @Test('PageUp from an empty composer enters transcript navigation')
    async pageUpEntersTranscriptFromComposer() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: Array.from({ length: 12 }, (_value, index) => `line ${index}`).join('\n'), createdAt: 2 } as any
        ]);
        expect(await (component as any).handleGlobalKeyInput('\u001b[5~')).toEqual(true);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m2');
        expect(state.messageDetailOpen).toEqual(false);
        expect(await (component as any).handleGlobalKeyInput('\u001b[H')).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m1');
    }

    @Test('message navigation is gated while message detail is open')
    async messageNavGatedWhileDetailOpen() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any
        ]);
        state.setMessagesFocused(true);
        state.setSelectedMessageId('m1');
        state.openMessageDetail();
        expect(await (component as any).handleGlobalKeyInput('\u001b[5~')).toEqual(false);
    }

    @Test('browser PageUp in pager moves the selection by a page')
    async browserPageUpMovesSelectionByPage() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any,
            { id: 'm4', role: 'assistant', content: '4', createdAt: 4 } as any,
            { id: 'm5', role: 'user', content: '5', createdAt: 5 } as any,
            { id: 'm6', role: 'assistant', content: '6', createdAt: 6 } as any,
            { id: 'm7', role: 'user', content: '7', createdAt: 7 } as any,
            { id: 'm8', role: 'assistant', content: '8', createdAt: 8 } as any
        ]);
        state.setMessagesFocused(true);
        const consumed = await (component as any).handleBrowserGlobalKeyInput('PageUp', {});
        expect(consumed).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m2');
    }

    @Test('browser Home in pager selects the first message')
    async browserHomeSelectsFirstMessage() {
        const { state, component } = createKeymapConsoleParts();
        state.setMessages([
            { id: 'm1', role: 'user', content: '1', createdAt: 1 } as any,
            { id: 'm2', role: 'assistant', content: '2', createdAt: 2 } as any,
            { id: 'm3', role: 'user', content: '3', createdAt: 3 } as any
        ]);
        state.setMessagesFocused(true);
        const consumed = await (component as any).handleBrowserGlobalKeyInput('Home', {});
        expect(consumed).toEqual(true);
        expect(state.selectedMessage?.id).toEqual('m1');
    }
}

@Suite('model favorites and variants keymap (P136)')
export class AgentConsoleModelKeymapTest {

    @Test('default keymap binds the four model actions')
    modelDefaultsResolve() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('ctrl+f', 'global')).toEqual('model-favorite-toggle');
        expect(keymap.resolve('f2', 'global')).toEqual('model-cycle-recent');
        expect(keymap.resolve('shift+f2', 'global')).toEqual('model-cycle-recent-back');
        expect(keymap.resolve('ctrl+t', 'global')).toEqual('model-variant-cycle');
    }

    @Test('model keymap defaults are global defaults, visible in every context')
    modelDefaultsVisibleAcrossContexts() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('ctrl+f', 'composer')).toEqual('model-favorite-toggle');
        expect(keymap.resolve('f2', 'pager')).toEqual('model-cycle-recent');
        expect(keymap.resolve('shift+f2', 'list')).toEqual('model-cycle-recent-back');
        expect(keymap.resolve('ctrl+t', 'approval')).toEqual('model-variant-cycle');
        expect(keymap.effectiveBindings('global')['ctrl+f']).toEqual('model-favorite-toggle');
        expect(keymap.effectiveBindings('global').f2).toEqual('model-cycle-recent');
        expect(Object.keys(AGENT_CONSOLE_PAGER_DEFAULT_KEYMAP)).not.toContain('f2');
        expect(Object.keys(AGENT_CONSOLE_PAGER_DEFAULT_KEYMAP)).not.toContain('ctrl+f');
    }

    @Test('TUI F2 sequences decode to recent-cycle keys')
    decodeF2Sequences() {
        const { component } = createKeymapConsoleParts();
        expect((component as any).decodeGlobalKey('\u001b[12~')).toEqual('f2');
        expect((component as any).decodeGlobalKey('\u001bOQ')).toEqual('f2');
        expect((component as any).decodeGlobalKey('\u001b[1;2Q')).toEqual('shift+f2');
        expect((component as any).decodeGlobalKey('\u001b[1;12~')).toEqual('shift+f2');
    }

    @Test('TUI F2 cycles the recent model forward; shift+F2 cycles back')
    async tuiF2CyclesRecent() {
        const { state, component } = createKeymapConsoleParts();
        state.setInputFocused(false);
        (component as any).modelRecents = ['flash', 'strong', 'fast'];
        state.setModelProfile('strong');
        expect(await (component as any).handleGlobalKeyInput('\u001b[12~')).toEqual(true);
        expect(state.modelProfile).toEqual('fast');
        (component as any).modelRecents = ['flash', 'strong', 'fast'];
        state.setModelProfile('strong');
        expect(await (component as any).handleGlobalKeyInput('\u001b[1;2Q')).toEqual(true);
        expect(state.modelProfile).toEqual('flash');
    }

    @Test('browser F2 cycles the recent model; shift+F2 cycles back')
    async browserF2CyclesRecent() {
        const { state, component } = createKeymapConsoleParts();
        (component as any).modelRecents = ['flash', 'strong', 'fast'];
        state.setModelProfile('strong');
        expect(await (component as any).handleBrowserGlobalKeyInput('F2', {})).toEqual(true);
        expect(state.modelProfile).toEqual('fast');
        (component as any).modelRecents = ['flash', 'strong', 'fast'];
        state.setModelProfile('strong');
        expect(await (component as any).handleBrowserGlobalKeyInput('F2', { shiftKey: true })).toEqual(true);
        expect(state.modelProfile).toEqual('flash');
    }

    @Test('recent cycle without recents notifies and keeps the profile')
    async recentCycleEmptyRecents() {
        const { state, component } = createKeymapConsoleParts();
        state.setModelProfile('flash');
        expect(await (component as any).executeGlobalKeyAction('model-cycle-recent')).toEqual(true);
        expect(state.modelProfile).toEqual('flash');
        expect(state.notice).toContain('No recent models yet.');
    }

    @Test('favorite toggle adds and removes the active profile and persists')
    async favoriteTogglePersists() {
        const adapter = new MemoryFileAdapter();
        const store = new AgentConsoleModelStore(adapter as any);
        const { state, component } = createKeymapConsoleParts(undefined, undefined, 'ws', undefined, store);
        state.setModelProfile('flash');
        expect(await (component as any).executeGlobalKeyAction('model-favorite-toggle')).toEqual(true);
        expect((component as any).modelFavorites).toEqual(['flash']);
        expect(state.notice).toContain('Added flash to favorites.');
        expect(await store.load('ws')).toEqual({ favorites: ['flash'], recents: [] });
        expect(await (component as any).executeGlobalKeyAction('model-favorite-toggle')).toEqual(true);
        expect((component as any).modelFavorites).toEqual([]);
        expect(state.notice).toContain('Removed flash from favorites.');
        expect(await store.load('ws')).toEqual({ favorites: [], recents: [] });
    }

    @Test('favorite toggle without a model profile notifies')
    async favoriteToggleNoProfile() {
        const { state, component } = createKeymapConsoleParts();
        expect(await (component as any).executeGlobalKeyAction('model-favorite-toggle')).toEqual(true);
        expect(state.notice).toContain('No active model profile to favorite.');
    }

    @Test('model activation records the recent profile and persists it')
    async activationRecordsRecent() {
        const adapter = new MemoryFileAdapter();
        const store = new AgentConsoleModelStore(adapter as any);
        const { state, component } = createKeymapConsoleParts(undefined, undefined, 'ws', undefined, store);
        await (component as any).activateModelProfile('strong');
        expect((component as any).modelRecents).toEqual(['strong']);
        expect(await store.load('ws')).toEqual({ favorites: [], recents: ['strong'] });
        await (component as any).activateModelProfile('fast');
        await (component as any).activateModelProfile('strong');
        expect((component as any).modelRecents).toEqual(['strong', 'fast']);
        expect(state.modelProfile).toEqual('strong');
    }

    @Test('restoreModelStore loads favorites and recents from disk')
    async restoreModelStoreLoads() {
        const adapter = new MemoryFileAdapter();
        adapter.files['ws/.tsdi-agent/models.json'] = JSON.stringify({
            version: 1,
            favorites: ['flash'],
            recents: ['strong', 'fast']
        });
        const store = new AgentConsoleModelStore(adapter as any);
        const { component } = createKeymapConsoleParts(undefined, undefined, 'ws', undefined, store);
        await (component as any).restoreModelStore();
        expect((component as any).modelFavorites).toEqual(['flash']);
        expect((component as any).modelRecents).toEqual(['strong', 'fast']);
    }

    @Test('variant cycle in local mode mutates options.model.reasoningEffort')
    async variantCycleLocalMode() {
        const { state, component } = createKeymapConsoleParts();
        (component as any).options.model = { reasoningEffort: 'low' };
        (component as any).modelReasoningEffort = 'low';
        (component as any).appRpc = null;
        expect(await (component as any).executeGlobalKeyAction('model-variant-cycle')).toEqual(true);
        expect((component as any).modelReasoningEffort).toEqual('medium');
        expect((component as any).options.model.reasoningEffort).toEqual('medium');
        expect(state.notice).toContain('Reasoning effort: medium.');
    }

    @Test('variant cycle over RPC sends reasoningEffort and adopts the returned tier')
    async variantCycleRpc() {
        const rpc = new RecordingRpc();
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        state.setModelProfile('flash');
        expect(await (component as any).executeGlobalKeyAction('model-variant-cycle')).toEqual(true);
        const call = rpc.calls.find((entry) => entry.method === 'model.activate');
        expect(call?.params).toMatchObject({ name: 'flash', reasoningEffort: 'high' });
        expect((component as any).modelReasoningEffort).toEqual('high');
        expect(state.notice).toContain('Reasoning effort: high.');
    }

    @Test('variant cycle over RPC without a profile notifies')
    async variantCycleRpcNoProfile() {
        const rpc = new RecordingRpc();
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, rpc);
        expect(await (component as any).executeGlobalKeyAction('model-variant-cycle')).toEqual(true);
        expect(state.notice).toContain('No active model profile to cycle variant for.');
    }
}

@Suite('which-key hint system (P137)')
export class AgentConsoleWhichKeyTest {

    @Test('default keymap binds ctrl+alt+k to which-key-toggle in every context')
    whichKeyBindingResolves() {
        const keymap = new AgentConsoleKeymap();
        expect(keymap.resolve('ctrl+alt+k', 'global')).toEqual('which-key-toggle');
        expect(keymap.resolve('ctrl+alt+k', 'composer')).toEqual('which-key-toggle');
        expect(keymap.resolve('ctrl+alt+k', 'pager')).toEqual('which-key-toggle');
        expect(keymap.resolve('ctrl+alt+k', 'list')).toEqual('which-key-toggle');
        expect(keymap.resolve('ctrl+alt+k', 'approval')).toEqual('which-key-toggle');
        expect(keymap.effectiveBindings('global')['ctrl+alt+k']).toEqual('which-key-toggle');
    }

    @Test('TUI Alt+Ctrl+K sequence decodes to ctrl+alt+k')
    tuiDecodesAltCtrlK() {
        const { component } = createKeymapConsoleParts();
        expect((component as any).decodeGlobalKey('\u001b\u000b')).toEqual('ctrl+alt+k');
    }

    @Test('TUI ctrl+alt+k toggles the overlay on with bindings snapshot')
    async tuiTogglesOverlayOn() {
        const { state, component } = createKeymapConsoleParts();
        expect(state.whichKeyVisible).toEqual(false);
        expect(await (component as any).handleGlobalKeyInput('\u001b\u000b')).toEqual(true);
        expect(state.whichKeyVisible).toEqual(true);
        expect(state.whichKeyBindings.length).toBeGreaterThan(0);
        const keymap = new AgentConsoleKeymap();
        const bindings = keymap.effectiveBindings((component as any).resolveKeymapContext());
        // The overlay snapshots one page of up to 25 bindings; the composer context
        // now has 24 (B4 removes ctrl+o and ctrl+x y), all on page 0 — ctrl+l included.
        expect(state.whichKeyBindings.length).toEqual(Math.min(Object.keys(bindings).length, 25));
        expect(state.whichKeyBindings).toContainEqual({ key: 'ctrl+alt+k', action: 'which-key-toggle' });
        expect(state.whichKeyBindings).toContainEqual({ key: 'ctrl+l', action: 'clear-scrollback' });
        expect(await (component as any).handleGlobalKeyInput('n')).toEqual(true);
        expect(state.whichKeyBindings).toEqual([]);
    }

    @Test('TUI ctrl+alt+k toggles the overlay off and clears bindings')
    async tuiTogglesOverlayOff() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleGlobalKeyInput('\u001b\u000b');
        expect(state.whichKeyVisible).toEqual(true);
        expect(await (component as any).handleGlobalKeyInput('\u001b\u000b')).toEqual(true);
        expect(state.whichKeyVisible).toEqual(false);
        expect(state.whichKeyBindings).toEqual([]);
    }

    @Test('TUI Esc closes the overlay and is consumed')
    async tuiEscClosesOverlay() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleGlobalKeyInput('\u001b\u000b');
        expect(state.whichKeyVisible).toEqual(true);
        expect(await (component as any).handleGlobalKeyInput('\u001b')).toEqual(true);
        expect(state.whichKeyVisible).toEqual(false);
    }

    @Test('TUI any other key closes the overlay and still executes')
    async tuiOtherKeyClosesOverlay() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleGlobalKeyInput('\u001b\u000b');
        expect(state.whichKeyVisible).toEqual(true);
        expect(await (component as any).handleGlobalKeyInput('\u0010')).toEqual(true);
        expect(state.whichKeyVisible).toEqual(false);
    }

    @Test('browser ctrl+alt+k toggles the overlay on and off')
    async browserTogglesOverlay() {
        const { state, component } = createKeymapConsoleParts();
        expect(await (component as any).handleBrowserGlobalKeyInput('k', { ctrlKey: true, altKey: true })).toEqual(true);
        expect(state.whichKeyVisible).toEqual(true);
        expect(state.whichKeyBindings).toContainEqual({ key: 'ctrl+alt+k', action: 'which-key-toggle' });
        expect(await (component as any).handleBrowserGlobalKeyInput('k', { ctrlKey: true, altKey: true })).toEqual(true);
        expect(state.whichKeyVisible).toEqual(false);
    }

    @Test('browser Esc closes the overlay while which-key is visible')
    async browserEscClosesOverlay() {
        const { state, component } = createKeymapConsoleParts();
        await (component as any).handleBrowserGlobalKeyInput('k', { ctrlKey: true, altKey: true });
        expect(state.whichKeyVisible).toEqual(true);
        expect(await (component as any).handleBrowserGlobalKeyInput('Escape', {})).toEqual(true);
        expect(state.whichKeyVisible).toEqual(false);
    }

    @Test('which-key panel exposes bindings and count from the session state')
    whichKeyPanelReadsState() {
        const { state } = createKeymapConsoleParts();
        state.setWhichKeyBindings([
            { key: 'ctrl+p', action: 'command-palette' },
            { key: 'ctrl+alt+k', action: 'which-key-toggle' }
        ]);
        const panel = new AgentConsoleWhichKeyPanelComponent(state);
        expect(panel.bindings).toEqual([
            { key: 'ctrl+p', action: 'command-palette' },
            { key: 'ctrl+alt+k', action: 'which-key-toggle' }
        ]);
        expect(panel.bindingCount).toEqual('2');
        expect(panel.hintText).toContain('Esc');
        expect((panel as any).shellStyle).toBeTruthy();
        expect((panel as any).keyStyle).toBeTruthy();
    }

    @Test('hiding the overlay clears the bindings snapshot')
    hideClearsBindings() {
        const { state } = createKeymapConsoleParts();
        state.setWhichKeyBindings([{ key: 'ctrl+p', action: 'command-palette' }]);
        expect(state.whichKeyBindings.length).toEqual(1);
        state.setWhichKeyVisible(false);
        expect(state.whichKeyBindings).toEqual([]);
    }
}

@Suite('queue-follow-up composer Tab keymap (B1)')
export class AgentConsoleQueueFollowUpKeymapTest {

    @Test('composer Tab resolves to queue-follow-up; other contexts leave Tab unbound')
    composerTabResolves() {
        const keymap = new AgentConsoleKeymap();
        expect(AGENT_CONSOLE_COMPOSER_DEFAULT_KEYMAP['tab']).toEqual('queue-follow-up');
        expect(isAgentConsoleGlobalAction('queue-follow-up')).toEqual(true);
        expect(keymap.resolve('tab', 'composer')).toEqual('queue-follow-up');
        expect(keymap.resolve('tab', 'global')).toBeUndefined();
        expect(keymap.resolve('tab', 'list')).toBeUndefined();
        expect(keymap.resolve('tab', 'approval')).toBeUndefined();
        expect(keymap.resolve('tab', 'pager')).toBeUndefined();
    }

    @Test('TUI Tab decodes to the tab key (not ctrl+i)')
    tuiTabDecodesToTab() {
        const { component } = createKeymapConsoleParts();
        expect((component as any).decodeGlobalKey('\t')).toEqual('tab');
    }

    @Test('Tab during a running turn queues the draft through the global key handler')
    async tuiTabQueuesFollowUpDraft() {
        const { state, component } = createKeymapConsoleParts();
        state.setStatus('running');
        state.setInput('queued follow-up');
        const consumed = await (component as any).handleGlobalKeyInput('\t');
        expect(consumed).toEqual(true);
        expect(state.queuedPromptCount).toEqual(1);
        expect(state.input).toEqual('');
        expect(state.notice).toContain('Queued prompt (1)');
    }
}

@Suite('clear-scrollback composer ctrl+l keymap (B3)')
export class AgentConsoleClearScrollbackKeymapTest {

    @Test('composer ctrl+l resolves to clear-scrollback; other contexts leave ctrl+l unbound')
    composerCtrlLResolves() {
        const keymap = new AgentConsoleKeymap();
        expect(AGENT_CONSOLE_COMPOSER_DEFAULT_KEYMAP['ctrl+l']).toEqual('clear-scrollback');
        expect(isAgentConsoleGlobalAction('clear-scrollback')).toEqual(true);
        expect(keymap.resolve('ctrl+l', 'composer')).toEqual('clear-scrollback');
        expect(keymap.resolve('ctrl+l', 'global')).toBeUndefined();
        expect(keymap.resolve('ctrl+l', 'list')).toBeUndefined();
        expect(keymap.resolve('ctrl+l', 'approval')).toBeUndefined();
        expect(keymap.resolve('ctrl+l', 'pager')).toBeUndefined();
    }

    @Test('TUI ctrl+l decodes to the ctrl+l key (not lowercase l)')
    tuiCtrlLDecodesToCtrlL() {
        const { component } = createKeymapConsoleParts();
        expect((component as any).decodeGlobalKey('\x0c')).toEqual('ctrl+l');
    }

    @Test('TUI ctrl+l clears the scrollback through the surface port without writing back')
    async tuiCtrlLClearsScrollback() {
        const writes: string[] = [];
        let resets = 0;
        const surfaceAccessor = {
            writeRawTerminalData: (data: string) => { writes.push(data); return true; },
            resetTerminalRenderState: () => { resets += 1; return true; }
        } as any;
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, undefined, undefined, surfaceAccessor);
        const consumed = await (component as any).handleGlobalKeyInput('\x0c');
        expect(consumed).toEqual(true);
        expect(writes).toEqual(['\x1b[2J\x1b[3J\x1b[H']);
        expect(resets).toEqual(1);
        expect(state.sessionId).toEqual('active-1');
        expect(state.messages.length).toEqual(0);
        expect(state.input).toEqual('');
    }

    @Test('TUI ctrl+l without a surface port only consumes the key')
    async tuiCtrlLWithoutSurfaceConsumes() {
        const { component } = createKeymapConsoleParts();
        expect(await (component as any).handleGlobalKeyInput('\x0c')).toEqual(true);
    }

    @Test('browser ctrl+l clears the scrollback through the surface port when present')
    async browserCtrlLClearsScrollback() {
        const writes: string[] = [];
        let resets = 0;
        const surfaceAccessor = {
            writeRawTerminalData: (data: string) => { writes.push(data); return true; },
            resetTerminalRenderState: () => { resets += 1; return true; }
        } as any;
        const { state, component } = createKeymapConsoleParts(undefined, undefined, undefined, undefined, undefined, surfaceAccessor);
        expect(await (component as any).handleBrowserGlobalKeyInput('l', { ctrlKey: true })).toEqual(true);
        expect(writes).toEqual(['\x1b[2J\x1b[3J\x1b[H']);
        expect(resets).toEqual(1);
        expect(state.sessionId).toEqual('active-1');
        expect(state.messages.length).toEqual(0);
    }

    @Test('browser ctrl+l without a surface port only consumes the key')
    async browserCtrlLWithoutSurfaceConsumes() {
        const { component } = createKeymapConsoleParts();
        expect(await (component as any).handleBrowserGlobalKeyInput('l', { ctrlKey: true })).toEqual(true);
    }
}
