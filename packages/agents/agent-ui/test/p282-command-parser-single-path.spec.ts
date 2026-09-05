import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    getAgentConsoleCommandDefinition,
    getAgentConsoleCommandName,
    parseAgentConsoleCommandArguments,
    formatAgentConsoleCommandDiagnostics,
    formatAgentConsoleCommandArgumentTemplate,
    tokenizeAgentConsoleCommandArguments
} from '../src';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleComponent, AgentConsoleEventBridge, AgentConsoleSessionService, AgentConsoleSessionState } from '../src';

class RuntimeStub {
    async runTurn(sessionId: string, input: string): Promise<any> {
        return { sessionId, message: { id: '2', role: 'assistant', content: `Echo: ${input}`, createdAt: 2 } };
    }
    async getMessages(): Promise<any[]> { return []; }
}

class SchedulerStub {
    async schedule(task: any): Promise<any> { return task; }
    getTasks(): any[] { return []; }
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

@Suite('P282 command parser single path')
export class P282CommandParserSinglePathTest {

    // ── enriched diagnostics: tokenIndex / expected / suggestion ────────────

    @Test('missing required arg reports tokenIndex, expected, suggestion')
    missingArgDiagnostics() {
        const def = getAgentConsoleCommandDefinition('/search')!;
        const result = parseAgentConsoleCommandArguments(def, '');
        expect(result.diagnostics).toHaveLength(1);
        const d = result.diagnostics[0];
        expect(d.code).toEqual('missing');
        expect(d.tokenIndex).toEqual(0);
        expect(d.expected).toEqual('<query>');
        expect(d.suggestion).toContain('Usage');
    }

    @Test('invalid enum reports the offending token index and valid alternatives')
    invalidEnumDiagnostics() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'mode', type: 'enum' as const, values: ['fast', 'safe'], required: true }]
        };
        const result = parseAgentConsoleCommandArguments(def, 'slow');
        expect(result.diagnostics).toHaveLength(1);
        const d = result.diagnostics[0];
        expect(d.code).toEqual('invalid');
        expect(d.tokenIndex).toEqual(0);
        expect(d.expected).toEqual('fast|safe');
        expect(d.suggestion).toEqual('Did you mean fast or safe?');
    }

    @Test('extra arg reports the first unexpected token index')
    extraArgDiagnostics() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'value' }]
        };
        const result = parseAgentConsoleCommandArguments(def, 'one two three');
        expect(result.diagnostics).toHaveLength(1);
        const d = result.diagnostics[0];
        expect(d.code).toEqual('extra');
        expect(d.tokenIndex).toEqual(1);
        expect(d.suggestion).toContain('Remove');
    }

    // ── formatAgentConsoleCommandDiagnostics ────────────────────────────────

    @Test('formatAgentConsoleCommandDiagnostics appends suggestion to message')
    formatDiagnostics() {
        const def = getAgentConsoleCommandDefinition('/search')!;
        const diags = parseAgentConsoleCommandArguments(def, '').diagnostics;
        const line = formatAgentConsoleCommandDiagnostics(diags);
        expect(line).toContain('Missing required argument <query>.');
        expect(line.trim()).toMatch(/Missing required argument <query>\. Usage:/);
    }

    @Test('formatAgentConsoleCommandDiagnostics joins multiple diagnostics')
    formatMultipleDiagnostics() {
        const def = {
            name: '/example', description: 'example', group: 'core' as const,
            args: [{ name: 'mode', type: 'enum' as const, values: ['a', 'b'] }, { name: 'v' }]
        };
        const diags = parseAgentConsoleCommandArguments(def, 'zzz extra tron').diagnostics;
        expect(diags.length).toBeGreaterThan(1);
        const codes = diags.map(d => d.code);
        expect(codes).toContain('invalid');
        expect(codes).toContain('extra');
        expect(formatAgentConsoleCommandDiagnostics(diags)).toContain('Unexpected argument');
    }

    // ── tokenizer: quotes and CJK ───────────────────────────────────────────

    @Test('tokenizer keeps quoted values intact')
    tokenizerQuotes() {
        expect(tokenizeAgentConsoleCommandArguments('"release notes" src/a.ts')).toEqual(['release notes', 'src/a.ts']);
        expect(tokenizeAgentConsoleCommandArguments("'single quoted' bare")).toEqual(['single quoted', 'bare']);
        expect(tokenizeAgentConsoleCommandArguments('a\\ b c')).toEqual(['a b', 'c']);
    }

    @Test('tokenizer handles CJK tokens without splitting')
    tokenizerCjk() {
        expect(tokenizeAgentConsoleCommandArguments('搜索 会话 记录')).toEqual(['搜索', '会话', '记录']);
        expect(tokenizeAgentConsoleCommandArguments('标题 "项目 计划"')).toEqual(['标题', '项目 计划']);
    }

    // ── per-category command contracts ──────────────────────────────────────

    @Test('session category: /search requires query, accepts quoted CJK variadic')
    searchContract() {
        const def = getAgentConsoleCommandDefinition('/search')!;
        expect(parseAgentConsoleCommandArguments(def, '').diagnostics[0].code).toEqual('missing');
        expect(parseAgentConsoleCommandArguments(def, '会话 记录').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(def, '"quoted query"').resolved).toEqual(['quoted query']);
    }

    @Test('display category: /yolo /display /raw validate enum members')
    displayEnumContracts() {
        const yolo = getAgentConsoleCommandDefinition('/yolo')!;
        expect(parseAgentConsoleCommandArguments(yolo, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(yolo, 'on').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(yolo, 'off').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(yolo, 'maybe').diagnostics[0].code).toEqual('invalid');

        const display = getAgentConsoleCommandDefinition('/display')!;
        ['on', 'off', 'show', 'hide', 'critical'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(display, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(display, 'bogus').diagnostics[0].code).toEqual('invalid');

        const raw = getAgentConsoleCommandDefinition('/raw')!;
        ['on', 'off', 'show', 'hide'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(raw, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(raw, 'never').diagnostics[0].code).toEqual('invalid');
    }

    @Test('session category: /model /snapshot accept optional variadic values')
    sessionOptionalContracts() {
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/model')!, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/model')!, 'deepseek-v4-pro').resolved).toEqual(['deepseek-v4-pro']);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/snapshot')!, 'release-1').diagnostics).toEqual([]);
    }

    @Test('review category: /review /diff keep tail variadic')
    reviewContracts() {
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/review')!, 'task-7').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/diff')!, '--staged src/a.ts').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/diff')!, '').diagnostics).toEqual([]);
    }

    @Test('aliases resolve to canonical definition before parsing')
    aliasResolvesForParse() {
        expect(getAgentConsoleCommandName('/q')).toEqual('/quit');
        expect(getAgentConsoleCommandDefinition('/q')).toBeDefined();
        // aliases carry no args schema but inherit canonical behavior at dispatch
        const canonical = getAgentConsoleCommandName('/q');
        expect(canonical).toEqual('/quit');
    }

    @Test('registry to handler coverage: every definition resolves a parseable contract')
    registryCoverage() {
        // Every command with an args schema must parse a representative value without crashing,
        // and formatAgentConsoleCommandArgumentTemplate must render for schema'd commands.
        const { AGENT_CONSOLE_COMMAND_DEFINITIONS } = require('../src');
        AGENT_CONSOLE_COMMAND_DEFINITIONS.forEach((def: any) => {
            expect(() => parseAgentConsoleCommandArguments(def, '')).not.toThrow();
            if (def.args?.length) {
                expect(formatAgentConsoleCommandArgumentTemplate(def)).toBeTruthy();
            }
        });
    }

    @Test('registry definitions and handlers map 1:1 (no defined-without-handler, no handler-without-definition)')
    registryHandlerBidirectionalCoverage() {
        const { AGENT_CONSOLE_COMMAND_DEFINITIONS } = require('../src/AgentConsoleCommandRegistry');
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const defNames = AGENT_CONSOLE_COMMAND_DEFINITIONS.map((def: any) => def.name);
        const handlerNames = Object.keys(COMMAND_HANDLERS);
        const aliases = new Set(
            AGENT_CONSOLE_COMMAND_DEFINITIONS.flatMap((def: any) => (def.aliases || []).map((a: string) => a))
        );
        // Handler keys must be definition names or declared aliases — never untracked.
        defNames.forEach((name: string) => {
            expect(handlerNames).toContain(name);
        });
        handlerNames.forEach((key: string) => {
            expect(defNames.includes(key) || aliases.has(key)).toBe(true);
        });
    }
}

@Suite('P282 draft/retry consistency through handleCommand')
export class P282DraftRetryConsistencyTest {

    @Test('required-arg diagnostics preserve the draft for correction')
    async missingArgPreservesDraft() {
        const { state, component } = createConsole();
        const result = await (component as any).handleCommand('/search');
        expect(result).toEqual(true);
        expect(state.input).toEqual('/search');
        expect(state.notice).toContain('Missing required argument');
        expect(state.latestCommandExecution?.status).toEqual('failed');
    }

    @Test('invalid enum preserves the draft and surfaces the suggestion')
    async invalidEnumPreservesDraft() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/yolo maybe');
        expect(state.input).toEqual('/yolo maybe');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.notice).toContain('maybe');
    }

    @Test('corrected retry passes the same single path and succeeds')
    async correctedRetrySucceeds() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/yolo maybe');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        await (component as any).handleCommand('/yolo on');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.commandExecutions.length).toBeGreaterThan(1);
    }
}
