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

    @Test('display cluster: /timeline /thinking validate enum members')
    displayClusterEnumContracts() {
        const timeline = getAgentConsoleCommandDefinition('/timeline')!;
        ['off', 'compact', 'steps', 'verbose'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(timeline, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(timeline, 'bogus').diagnostics[0].code).toEqual('invalid');

        const thinking = getAgentConsoleCommandDefinition('/thinking')!;
        ['on', 'off', 'show', 'hide'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(thinking, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(thinking, 'bogus').diagnostics[0].code).toEqual('invalid');
    }

    @Test('display cluster: /theme /statusline accept canonical free-form + verb grammar')
    displayClusterVariadicContracts() {
        const theme = getAgentConsoleCommandDefinition('/theme')!;
        expect(parseAgentConsoleCommandArguments(theme, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(theme, 'solarized').resolved).toEqual(['solarized']);
        expect(parseAgentConsoleCommandArguments(theme, '"Solarized Dark"').resolved).toEqual(['Solarized Dark']);

        const statusline = getAgentConsoleCommandDefinition('/statusline')!;
        expect(parseAgentConsoleCommandArguments(statusline, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(statusline, 'list').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(statusline, 'set model,context').resolved).toEqual(['set', 'model,context']);
        expect(parseAgentConsoleCommandArguments(statusline, 'unset model').resolved).toEqual(['unset', 'model']);
        expect(parseAgentConsoleCommandArguments(statusline, 'set "context,git-branch"').resolved).toEqual(['set', 'context,git-branch']);
        expect(parseAgentConsoleCommandArguments(statusline, 'toggle').diagnostics[0].code).toEqual('invalid');
    }

    @Test('hooks cluster: /fast /personality accept canonical values')
    hooksClusterContracts() {
        const fast = getAgentConsoleCommandDefinition('/fast')!;
        expect(parseAgentConsoleCommandArguments(fast, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(fast, 'deepseek').resolved).toEqual(['deepseek']);

        const personality = getAgentConsoleCommandDefinition('/personality')!;
        expect(parseAgentConsoleCommandArguments(personality, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(personality, 'list').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(personality, 'set fire').resolved).toEqual(['set', 'fire']);
        expect(parseAgentConsoleCommandArguments(personality, 'unset').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(personality, 'reset').diagnostics[0].code).toEqual('invalid');
    }

    @Test('input cluster: /apps /plugins accept a single optional id')
    inputClusterSingleIdContracts() {
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/apps')!, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/apps')!, 'gmail').resolved).toEqual(['gmail']);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/apps')!, '$gmail').resolved).toEqual(['$gmail']);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/plugins')!, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(getAgentConsoleCommandDefinition('/plugins')!, 'plugin-a').resolved).toEqual(['plugin-a']);
    }

    @Test('input cluster: /editor /skills accept variadic free-form (joined tail)')
    inputClusterVariadicFreeFormContracts() {
        const editor = getAgentConsoleCommandDefinition('/editor')!;
        expect(parseAgentConsoleCommandArguments(editor, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(editor, 'fix this bug').resolved).toEqual(['fix this bug']);
        expect(parseAgentConsoleCommandArguments(editor, '"fix this bug"').resolved).toEqual(['fix this bug']);

        const skills = getAgentConsoleCommandDefinition('/skills')!;
        expect(parseAgentConsoleCommandArguments(skills, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(skills, 'async patterns').resolved).toEqual(['async patterns']);
        expect(parseAgentConsoleCommandArguments(skills, '"async patterns"').resolved).toEqual(['async patterns']);
    }

    @Test('input cluster: /stash /voice /mcp validate verbs with handler aliases')
    inputClusterVerbEnumContracts() {
        const stash = getAgentConsoleCommandDefinition('/stash')!;
        expect(parseAgentConsoleCommandArguments(stash, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'list').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'push').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'save').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'pop').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'restore').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'rm').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'drop').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'delete').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(stash, 'push "my stash"').resolved).toEqual(['push', 'my stash']);
        expect(parseAgentConsoleCommandArguments(stash, 'bogus').diagnostics[0].code).toEqual('invalid');

        const voice = getAgentConsoleCommandDefinition('/voice')!;
        expect(parseAgentConsoleCommandArguments(voice, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(voice, 'start').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(voice, 'stop').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(voice, 'cancel').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(voice, 'status').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(voice, 'loud').diagnostics[0].code).toEqual('invalid');

        const mcp = getAgentConsoleCommandDefinition('/mcp')!;
        expect(parseAgentConsoleCommandArguments(mcp, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(mcp, 'verbose').resolved).toEqual(['verbose']);
        expect(parseAgentConsoleCommandArguments(mcp, '-v').resolved).toEqual(['-v']);
        expect(parseAgentConsoleCommandArguments(mcp, 'chat').diagnostics[0].code).toEqual('invalid');
    }

    @Test('session cluster: /fork /side accept an optional messageId')
    sessionClusterSingleIdContracts() {
        const fork = getAgentConsoleCommandDefinition('/fork')!;
        expect(parseAgentConsoleCommandArguments(fork, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(fork, 'msg-123').resolved).toEqual(['msg-123']);
        expect(parseAgentConsoleCommandArguments(fork, '"msg 123"').resolved).toEqual(['msg 123']);
        expect(parseAgentConsoleCommandArguments(fork, 'a b').diagnostics[0].code).toEqual('extra');

        const side = getAgentConsoleCommandDefinition('/side')!;
        expect(parseAgentConsoleCommandArguments(side, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(side, 'msg-456').resolved).toEqual(['msg-456']);
        expect(parseAgentConsoleCommandArguments(side, 'a b').diagnostics[0].code).toEqual('extra');

        const unshare = getAgentConsoleCommandDefinition('/unshare')!;
        expect(parseAgentConsoleCommandArguments(unshare, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(unshare, 'tk-1').resolved).toEqual(['tk-1']);
        expect(parseAgentConsoleCommandArguments(unshare, 'tk-1 tk-2').diagnostics[0].code).toEqual('extra');
    }

    @Test('session cluster: /sections accepts a variadic label tail')
    sessionClusterVariadicLabelContracts() {
        const sections = getAgentConsoleCommandDefinition('/sections')!;
        expect(parseAgentConsoleCommandArguments(sections, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(sections, 'Next step').resolved).toEqual(['Next step']);
        expect(parseAgentConsoleCommandArguments(sections, '"Next step"').resolved).toEqual(['Next step']);
    }

    @Test('session cluster: bare commands pass through without diagnostics')
    sessionClusterBareContracts() {
        ['/resume', '/archive', '/share', '/threads'].forEach(name => {
            const def = getAgentConsoleCommandDefinition(name)!;
            expect(parseAgentConsoleCommandArguments(def, '').diagnostics).toEqual([]);
            expect(parseAgentConsoleCommandArguments(def, 'anything at all').diagnostics).toEqual([]);
        });
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

    @Test('canonical args: quoted /timeline value reaches the handler resolved')
    async timelineQuotedCanonical() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/timeline "steps"');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.timelineViewMode).toEqual('steps');
    }

    @Test('canonical args: /thinking off then on toggles the thinking switch')
    async thinkingCanonicalToggle() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/thinking off');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.showThinking).toEqual(false);
        await (component as any).handleCommand('/thinking on');
        expect(state.showThinking).toEqual(true);
    }

    @Test('canonical args: /statusline set model,context applies both fields')
    async statuslineCanonicalSet() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/statusline set model,context');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.statusline).toContain('model');
        expect(state.statusline).toContain('context');
    }

    @Test('invalid /personality verb preserves the draft for correction')
    async personalityInvalidVerbPreservesDraft() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/personality reset');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.input).toEqual('/personality reset');
        expect(state.notice).toContain('reset');
    }

    @Test('handlers consume parsedArgs.resolved over raw args when meta carries the parse')
    async handlerPrefersCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        let received: string | undefined;
        const ctx = {
            runTimelineModeCommand: async (arg: string) => { received = arg; return true; }
        } as any;
        await COMMAND_HANDLERS['/timeline'](ctx, 'garbage raw', {
            command: '/timeline',
            matches: ['/timeline'],
            parsedArgs: { values: ['verbose'], resolved: ['verbose'], diagnostics: [] }
        });
        expect(received).toEqual('verbose');
    }

    @Test('handlers fall back to raw args when meta lacks parsedArgs (direct invocation)')
    async handlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        let received: string | undefined;
        const ctx = {
            runTimelineModeCommand: async (arg: string) => { received = arg; return true; }
        } as any;
        await COMMAND_HANDLERS['/timeline'](ctx, 'compact', { command: '/timeline', matches: ['/timeline'] });
        expect(received).toEqual('compact');
    }

    @Test('handlers consume resolved args for /editor /stash /apps /skills /mcp /plugins /voice')
    async inputClusterHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            runEditorCommand: async (arg: string) => { received.push(`editor:${arg}`); return true; },
            runStashCommand: async (arg: string) => { received.push(`stash:${arg}`); return true; },
            runAppsCommand: async (arg: string) => { received.push(`apps:${arg}`); return true; },
            runSkillsCommand: async (arg: string) => { received.push(`skills:${arg}`); return true; },
            runMcpCommand: async (arg: string) => { received.push(`mcp:${arg}`); return true; },
            runPluginsCommand: async (arg: string) => { received.push(`plugins:${arg}`); return true; },
            handleVoiceCommand: async (arg: string) => { received.push(`voice:${arg}`); return true; }
        } as any;
        const metaFor = (resolved: string[]) => ({
            command: '/editor', matches: ['/editor'],
            parsedArgs: { values: resolved, resolved, diagnostics: [] }
        });
        await COMMAND_HANDLERS['/editor'](ctx, 'garbage', metaFor(['fix', 'this', 'bug']));
        await COMMAND_HANDLERS['/stash'](ctx, 'garbage', metaFor(['push', 'my stash']));
        await COMMAND_HANDLERS['/apps'](ctx, 'garbage', metaFor(['gmail']));
        await COMMAND_HANDLERS['/skills'](ctx, 'garbage', metaFor(['async patterns']));
        await COMMAND_HANDLERS['/mcp'](ctx, 'garbage', metaFor(['verbose']));
        await COMMAND_HANDLERS['/plugins'](ctx, 'garbage', metaFor(['plugin-a']));
        await COMMAND_HANDLERS['/voice'](ctx, 'garbage', metaFor(['stop']));
        expect(received).toEqual([
            'editor:fix this bug',
            'stash:push my stash',
            'apps:gmail',
            'skills:async patterns',
            'mcp:verbose',
            'plugins:plugin-a',
            'voice:stop'
        ]);
    }

    @Test('handlers consume resolved args for /fork /side /sections /unshare')
    async sessionClusterHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            state: {
                sessionId: 'active-1',
                closeReview: () => {},
                closeGitSnapshotDetail: () => {}
            },
            sessionService: {
                forkSession: async (_source: string, mid?: string) => { received.push(`fork:${mid}`); return 'forked-1'; },
                createSection: async (_sid: string, label: string) => { received.push(`section:${label}`); }
            },
            refreshCurrentSections: async () => {},
            openSession: async () => {},
            notify: (msg: string) => { received.push(`notify:${msg}`); }
        } as any;
        await COMMAND_HANDLERS['/fork'](ctx, 'garbage raw', {
            command: '/fork', matches: ['/fork'],
            parsedArgs: { values: ['msg-123'], resolved: ['msg-123'], diagnostics: [] }
        });
        await COMMAND_HANDLERS['/side'](ctx, 'garbage', {
            command: '/side', matches: ['/side'],
            parsedArgs: { values: ['msg-456'], resolved: ['msg-456'], diagnostics: [] }
        });
        await COMMAND_HANDLERS['/sections'](ctx, 'garbage', {
            command: '/sections', matches: ['/sections'],
            parsedArgs: { values: ['Next step'], resolved: ['Next step'], diagnostics: [] }
        });
        expect(received).toContain('fork:msg-123');
        expect(received).toContain('fork:msg-456');
        expect(received).toContain('section:Next step');
        expect(received).toContain('notify:Opened side session forked-1.');

        const runCtx = {
            runShareCommand: async (arg: string) => { received.push(`share:${arg}`); return true; },
            runUnshareCommand: async (arg: string) => { received.push(`unshare:${arg}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/share'](runCtx, 'garbage', {
            command: '/share', matches: ['/share'],
            parsedArgs: { values: [], resolved: [], diagnostics: [] }
        });
        await COMMAND_HANDLERS['/unshare'](runCtx, 'garbage', {
            command: '/unshare', matches: ['/unshare'],
            parsedArgs: { values: ['tk-1'], resolved: ['tk-1'], diagnostics: [] }
        });
        expect(received).toContain('share:');
        expect(received).toContain('unshare:tk-1');
    }

    @Test('session-cluster handlers fall back to raw args without parsedArgs')
    async sessionClusterHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            state: {
                sessionId: 'active-1',
                closeReview: () => {},
                closeGitSnapshotDetail: () => {}
            },
            sessionService: {
                forkSession: async (_source: string, mid?: string) => { received.push(`fork:${mid}`); return 'forked-1'; },
                createSection: async (_sid: string, label: string) => { received.push(`section:${label}`); }
            },
            refreshCurrentSections: async () => {},
            openSession: async () => {},
            notify: () => {}
        } as any;
        await COMMAND_HANDLERS['/fork'](ctx, 'msg-raw', { command: '/fork', matches: ['/fork'] });
        await COMMAND_HANDLERS['/sections'](ctx, 'raw label', { command: '/sections', matches: ['/sections'] });
        expect(received).toContain('fork:msg-raw');
        expect(received).toContain('section:raw label');

        const unshareCtx = {
            runUnshareCommand: async (arg: string) => { received.push(`unshare:${arg}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/unshare'](unshareCtx, 'tk-raw', { command: '/unshare', matches: ['/unshare'] });
        expect(received).toContain('unshare:tk-raw');
    }

    @Test('extra token in /fork preserves the draft for correction')
    async forkExtraTokenPreservesDraft() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/fork a b');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.input).toEqual('/fork a b');
        expect(state.notice).toContain('Unexpected');
    }

    @Test('input-cluster handlers fall back to raw args without parsedArgs')
    async inputClusterHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        let received: string | undefined;
        const ctx = {
            runStashCommand: async (arg: string) => { received = arg; return true; }
        } as any;
        await COMMAND_HANDLERS['/stash'](ctx, 'pop release-1', { command: '/stash', matches: ['/stash'] });
        expect(received).toEqual('pop release-1');
        const voiceCtx = {
            handleVoiceCommand: async (arg: string) => { received = arg; return true; }
        } as any;
        await COMMAND_HANDLERS['/voice'](voiceCtx, 'start', { command: '/voice', matches: ['/voice'] });
        expect(received).toEqual('start');
    }
}
