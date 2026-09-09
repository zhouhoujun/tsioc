import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    AgentConsoleComponent,
    AgentConsoleEventBridge,
    AgentConsoleSelectPanelComponent,
    AgentConsoleSessionService,
    AgentConsoleSessionState,
    formatAgentConsoleCommandArgumentForm,
    formatAgentConsoleCommandDiagnosticEcho,
    getAgentConsoleCommandDefinition,
    parseAgentConsoleCommandArguments
} from '../src';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';

class RuntimeStub {
    async runTurn(_sessionId: string, input: string): Promise<any> {
        return { sessionId: '', message: { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 } };
    }
    async getMessages(): Promise<any[]> { return []; }
}

class SchedulerStub {
    async schedule(task: any): Promise<any> { return task; }
    getTasks(): any[] { return []; }
}

class FakeAppRpc {
    async request(method: string): Promise<any> {
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

function createConsole(): { state: AgentConsoleSessionState; component: AgentConsoleComponent } {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'active-1' } as any);
    const runtime = new RuntimeStub() as any;
    const rpc = new FakeAppRpc() as any;
    const sessionService = new AgentConsoleSessionService(rpc, null);
    const bridge = new AgentConsoleEventBridge(state, runtime, null, rpc, null);
    const component = new AgentConsoleComponent(
        state, runtime, new SchedulerStub() as any, bridge,
        { ui: { title: 'Console' } } as any, null, rpc, sessionService,
        undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, null, null
    );
    return { state, component };
}

@Suite('schema-driven command forms and diagnostic echo (P287)')
export class P287CommandSchemaFormEchoTest {

    // ── formatAgentConsoleCommandArgumentForm ──────────────────────────────

    @Test('argument form renders required variadic rows from the schema')
    argumentFormRows() {
        expect(formatAgentConsoleCommandArgumentForm(getAgentConsoleCommandDefinition('/search')))
            .toEqual(['query...: string (required)']);
        expect(formatAgentConsoleCommandArgumentForm(getAgentConsoleCommandDefinition('/model')))
            .toEqual(['profile...: string']);
    }

    @Test('argument form renders enum type and defaults')
    argumentFormEnums() {
        expect(formatAgentConsoleCommandArgumentForm(getAgentConsoleCommandDefinition('/mcp')))
            .toEqual(['mode: enum(verbose|-v)']);
        expect(formatAgentConsoleCommandArgumentForm(getAgentConsoleCommandDefinition('/permissions')))
            .toEqual(['area: enum(status|readonly|plan|sandbox)', 'arg...: string']);
    }

    @Test('argument form renders empty for argument-less commands')
    argumentFormEmpty() {
        expect(formatAgentConsoleCommandArgumentForm(getAgentConsoleCommandDefinition('/help'))).toEqual([]);
        expect(formatAgentConsoleCommandArgumentForm(undefined)).toEqual([]);
    }

    // ── formatAgentConsoleCommandDiagnosticEcho ────────────────────────────

    @Test('echo renders message plus expected and maybe rows per diagnostic')
    echoRows() {
        const diags = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/search')!, '').diagnostics;
        expect(formatAgentConsoleCommandDiagnosticEcho(diags))
            .toEqual([
                'Missing required argument <query>.',
                'expected: <query>',
                'maybe: Usage: /search query.'
            ]);
    }

    @Test('echo keeps maybe suggestion for invalid enum values')
    echoInvalidEnum() {
        const diags = parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/yolo')!, 'maybe').diagnostics;
        const rows = formatAgentConsoleCommandDiagnosticEcho(diags);
        expect(rows[0]).toEqual('Invalid mode "maybe". Expected: on, off.');
        expect(rows).toContain('expected: on|off');
        expect(rows).toContain('maybe: Did you mean on or off?');
    }

    @Test('echo flattens multiple diagnostics into message/expected/maybe triplets')
    echoMultiple() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'mode', type: 'enum' as const, values: ['a', 'b'] }, { name: 'v' }]
        };
        const diags = parseAgentConsoleCommandArguments(def, 'zzz extra tron').diagnostics;
        expect(diags.length).toBeGreaterThan(1);
        const rows = formatAgentConsoleCommandDiagnosticEcho(diags);
        expect(rows.filter(row => row.startsWith('expected: ')).length).toEqual(diags.length);
        expect(rows).toContain('expected: a|b');
        expect(rows).toContain('expected: <none>');
        expect(rows.some(row => row.startsWith('maybe: Remove'))).toBe(true);
    }

    // ── command palette annotates argument-bearing commands ────────────────

    @Test('palette options carry schema form detail for arg commands and omit it otherwise')
    async paletteCarriesFormDetail() {
        const { component } = createConsole();
        await component.onInit();
        (component as any).openCommandPalette('');
        const options = (component.selectMenu?.options || []).map(option => ({
            value: option.value,
            detail: option.detail
        }));
        const search = options.find(option => option.value === '/search');
        expect(search?.detail).toEqual('query...: string (required)');
        const status = options.find(option => option.value === '/status');
        expect(status?.detail).toBeUndefined();
    }

    // ── select panel exposes JSON detail lines for the TUI select-core ──────

    @Test('select panel renders only string detail into detailLines JSON')
    panelDetailLines() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Command palette', [
            { label: '/search', value: '/search', detail: 'query...: string (required)' },
            { label: '/help', value: '/help' }
        ], 0);
        const panel = new AgentConsoleSelectPanelComponent(state);
        expect(panel.menuDetailLinesJson).toEqual('["query...: string (required)"]');
        state.selectMenu!.selectedIndex = 1;
        expect(panel.menuDetailLinesJson).toEqual('');
    }

    @Test('select panel ignores object/array detail so structured hints never leak')
    panelIgnoresObjectDetail() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Suggestions', [
            { label: '/help', value: '/help', description: 'Commands', detail: { command: '/help' } }
        ], 0);
        const panel = new AgentConsoleSelectPanelComponent(state);
        expect(panel.menuDetailLines).toEqual([]);
        expect(panel.menuDetailLinesJson).toEqual('');
    }

    @Test('select panel caps detail lines at the configured visible count')
    panelDetailLinesCap() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.openSelectMenu('Command palette', [
            { label: '/permissions', value: '/permissions', detail: 'area: enum(status|readonly|plan|sandbox)\narg...: string' }
        ], 0);
        const panel = new AgentConsoleSelectPanelComponent(state);
        state.consoleOptions.selectDetailVisibleLines = 1;
        expect(panel.menuDetailLines).toEqual(['area: enum(status|readonly|plan|sandbox)']);
        expect(panel.menuDetailLinesJson).toEqual('["area: enum(status|readonly|plan|sandbox)"]');
    }

    // ── handleCommand surfaces multi-line echo while preserving the draft ────

    @Test('missing required arg notices multi-line echo and keeps the draft')
    async handleCommandEchoNotice() {
        const { state, component } = createConsole();
        await component.onInit();
        const result = await (component as any).handleCommand('/search');
        expect(result).toEqual(true);
        expect(state.input).toEqual('/search');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.notice).toBe(
            'Missing required argument <query>.\nexpected: <query>\nmaybe: Usage: /search query.'
        );
        expect(state.textOverlay).toBeNull();
    }

    @Test('invalid enum echo surfaces expected and maybe rows')
    async handleCommandEchoInvalid() {
        const { state, component } = createConsole();
        await component.onInit();
        await (component as any).handleCommand('/yolo maybe');
        expect(state.input).toEqual('/yolo maybe');
        expect(state.notice).toBe(
            'Invalid mode "maybe". Expected: on, off.\nexpected: on|off\nmaybe: Did you mean on or off?'
        );
    }

    @Test('multiple diagnostics open the notice overlay with the full echo')
    async handleCommandOverlayOnMultiDiag() {
        const { state, component } = createConsole();
        await component.onInit();
        await (component as any).handleCommand('/vim maybe x');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.textOverlay?.title).toEqual('notice');
        const rows = formatAgentConsoleCommandDiagnosticEcho(
            parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/vim')!, 'maybe x').diagnostics
        );
        expect(state.textOverlay?.lines).toEqual(rows);
        expect(state.notice).toBe(rows.join('\n'));
    }
}