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

    @Test('session nav: /session /new /tools accept an optional value')
    sessionNavClusterSingleIdContracts() {
        const session = getAgentConsoleCommandDefinition('/session')!;
        expect(parseAgentConsoleCommandArguments(session, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(session, 'sess-123').resolved).toEqual(['sess-123']);
        expect(parseAgentConsoleCommandArguments(session, 'a b').diagnostics[0].code).toEqual('extra');

        const fresh = getAgentConsoleCommandDefinition('/new')!;
        expect(parseAgentConsoleCommandArguments(fresh, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(fresh, 'sess-456').resolved).toEqual(['sess-456']);
        expect(parseAgentConsoleCommandArguments(fresh, 'a b').diagnostics[0].code).toEqual('extra');

        const tools = getAgentConsoleCommandDefinition('/tools')!;
        expect(parseAgentConsoleCommandArguments(tools, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(tools, 'bash').resolved).toEqual(['bash']);
        expect(parseAgentConsoleCommandArguments(tools, 'a b').diagnostics[0].code).toEqual('extra');
    }

    @Test('session nav: /approve /deny accept an optional id and /approve retry passes')
    approveDenyIdContracts() {
        const approve = getAgentConsoleCommandDefinition('/approve')!;
        expect(parseAgentConsoleCommandArguments(approve, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(approve, 'req-1').resolved).toEqual(['req-1']);
        expect(parseAgentConsoleCommandArguments(approve, 'retry').resolved).toEqual(['retry']);
        expect(parseAgentConsoleCommandArguments(approve, 'a b').diagnostics[0].code).toEqual('extra');

        const deny = getAgentConsoleCommandDefinition('/deny')!;
        expect(parseAgentConsoleCommandArguments(deny, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(deny, 'req-2').resolved).toEqual(['req-2']);
        expect(parseAgentConsoleCommandArguments(deny, 'a b').diagnostics[0].code).toEqual('extra');
    }

    @Test('session nav: /title accepts a variadic name preserving set/list/unset verbs')
    titleVariadicContracts() {
        const title = getAgentConsoleCommandDefinition('/title')!;
        expect(parseAgentConsoleCommandArguments(title, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(title, 'my title').resolved).toEqual(['my title']);
        expect(parseAgentConsoleCommandArguments(title, '"my title"').resolved).toEqual(['my title']);
        expect(parseAgentConsoleCommandArguments(title, 'set model,context').resolved).toEqual(['set model,context']);
    }

    @Test('session nav: /copy restricts to input/workspace/session/model enum')
    copyEnumTargetContracts() {
        const copy = getAgentConsoleCommandDefinition('/copy')!;
        expect(parseAgentConsoleCommandArguments(copy, '').diagnostics).toEqual([]);
        ['input', 'workspace', 'session', 'model'].forEach(target => {
            expect(parseAgentConsoleCommandArguments(copy, target).resolved).toEqual([target]);
        });
        expect(parseAgentConsoleCommandArguments(copy, 'bogus').diagnostics[0].code).toEqual('invalid');
    }

    @Test('delegation cluster: /delegation /usage /quality /compactions /compact /diagnostics /harness keep a variadic free-form tail')
    delegationClusterVariadicContracts() {
        ['/delegation', '/usage', '/quality', '/compactions', '/compact', '/diagnostics', '/harness'].forEach(name => {
            const def = getAgentConsoleCommandDefinition(name)!;
            expect(parseAgentConsoleCommandArguments(def, '').diagnostics).toEqual([]);
            expect(parseAgentConsoleCommandArguments(def, 'tree sess-1 2').resolved).toEqual(['tree sess-1 2']);
            expect(parseAgentConsoleCommandArguments(def, 'daily s1').resolved).toEqual(['daily s1']);
            expect(parseAgentConsoleCommandArguments(def, '"quoted value"').resolved).toEqual(['quoted value']);
        });
        const delegation = getAgentConsoleCommandDefinition('/delegation')!;
        expect(parseAgentConsoleCommandArguments(delegation, 'tree').resolved).toEqual(['tree']);
        expect(parseAgentConsoleCommandArguments(delegation, 'lineage s1').resolved).toEqual(['lineage s1']);
        expect(parseAgentConsoleCommandArguments(delegation, 'mode explicit').resolved).toEqual(['mode explicit']);
        expect(parseAgentConsoleCommandArguments(delegation, 'sess-filter').resolved).toEqual(['sess-filter']);
        const quality = getAgentConsoleCommandDefinition('/quality')!;
        expect(parseAgentConsoleCommandArguments(quality, 'list client-1').resolved).toEqual(['list client-1']);
        expect(parseAgentConsoleCommandArguments(quality, 'trend client-2 7 30').resolved).toEqual(['trend client-2 7 30']);
        const diagnostics = getAgentConsoleCommandDefinition('/diagnostics')!;
        expect(parseAgentConsoleCommandArguments(diagnostics, 'list sid').resolved).toEqual(['list sid']);
        const harness = getAgentConsoleCommandDefinition('/harness')!;
        expect(parseAgentConsoleCommandArguments(harness, 'audit sid').resolved).toEqual(['audit sid']);
        expect(parseAgentConsoleCommandArguments(harness, 'profile list').resolved).toEqual(['profile list']);
        const compact = getAgentConsoleCommandDefinition('/compact')!;
        expect(parseAgentConsoleCommandArguments(compact, 'too long').resolved).toEqual(['too long']);
    }

    @Test('core mode/toggle cluster: /vim /plan /archetype /experimental /keymap /permissions get precise contracts')
    coreModeClusterContracts() {
        const vim = getAgentConsoleCommandDefinition('/vim')!;
        expect(parseAgentConsoleCommandArguments(vim, '').diagnostics).toEqual([]);
        ['on', 'off', '1', '0', 'true', 'false'].forEach(mode => {
            expect(parseAgentConsoleCommandArguments(vim, mode).resolved).toEqual([mode]);
        });
        expect(parseAgentConsoleCommandArguments(vim, 'maybe').diagnostics[0].code).toEqual('invalid');

        const plan = getAgentConsoleCommandDefinition('/plan')!;
        expect(parseAgentConsoleCommandArguments(plan, 'off').resolved).toEqual(['off']);
        expect(parseAgentConsoleCommandArguments(plan, 'maybe').diagnostics[0].code).toEqual('invalid');

        const archetype = getAgentConsoleCommandDefinition('/archetype')!;
        expect(parseAgentConsoleCommandArguments(archetype, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(archetype, 'build').resolved).toEqual(['build']);

        const experimental = getAgentConsoleCommandDefinition('/experimental')!;
        expect(parseAgentConsoleCommandArguments(experimental, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(experimental, 'tree-sitter on').resolved).toEqual(['tree-sitter', 'on']);
        expect(parseAgentConsoleCommandArguments(experimental, 'side-pane on').resolved).toEqual(['side-pane', 'on']);
        expect(parseAgentConsoleCommandArguments(experimental, 'feature maybe').diagnostics[0].code).toEqual('invalid');
        expect(parseAgentConsoleCommandArguments(experimental, 'side-pane on extra').diagnostics[0].code).toEqual('extra');

        const keymap = getAgentConsoleCommandDefinition('/keymap')!;
        expect(parseAgentConsoleCommandArguments(keymap, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(keymap, 'list').resolved).toEqual(['list']);
        expect(parseAgentConsoleCommandArguments(keymap, 'global set ctrl+c copy').resolved).toEqual(['global set ctrl+c copy']);

        const permissions = getAgentConsoleCommandDefinition('/permissions')!;
        expect(parseAgentConsoleCommandArguments(permissions, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(permissions, 'status').resolved).toEqual(['status']);
        expect(parseAgentConsoleCommandArguments(permissions, 'readonly on').resolved).toEqual(['readonly', 'on']);
        expect(parseAgentConsoleCommandArguments(permissions, 'sandbox default').resolved).toEqual(['sandbox', 'default']);
        expect(parseAgentConsoleCommandArguments(permissions, 'bogus on').diagnostics[0].code).toEqual('invalid');
    }

    @Test('session-tools cluster: /git-snapshots /export /cd /init /ssh get precise contracts')
    sessionToolsClusterContracts() {
        const gitSnapshots = getAgentConsoleCommandDefinition('/git-snapshots')!;
        expect(parseAgentConsoleCommandArguments(gitSnapshots, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'list').resolved).toEqual(['list']);
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'diff msg-1').resolved).toEqual(['diff', 'msg-1']);
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'revert m1').resolved).toEqual(['revert', 'm1']);
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'restore m1').resolved).toEqual(['restore', 'm1']);
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'unrevert').resolved).toEqual(['unrevert']);
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'ls').diagnostics[0].code).toEqual('invalid');
        expect(parseAgentConsoleCommandArguments(gitSnapshots, 'bogus').diagnostics[0].code).toEqual('invalid');

        const exportDef = getAgentConsoleCommandDefinition('/export')!;
        expect(parseAgentConsoleCommandArguments(exportDef, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(exportDef, 'jsonl').resolved).toEqual(['jsonl']);
        expect(parseAgentConsoleCommandArguments(exportDef, 'jsonl sess-1 ./out.json').resolved).toEqual(['jsonl sess-1 ./out.json']);
        expect(parseAgentConsoleCommandArguments(exportDef, '"quoted value"').resolved).toEqual(['quoted value']);

        const cd = getAgentConsoleCommandDefinition('/cd')!;
        expect(parseAgentConsoleCommandArguments(cd, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(cd, '/tmp').resolved).toEqual(['/tmp']);
        expect(parseAgentConsoleCommandArguments(cd, 'my dir').resolved).toEqual(['my dir']);
        expect(parseAgentConsoleCommandArguments(cd, '"my dir"').resolved).toEqual(['my dir']);

        const init = getAgentConsoleCommandDefinition('/init')!;
        expect(parseAgentConsoleCommandArguments(init, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(init, '--force').resolved).toEqual(['--force']);
        expect(parseAgentConsoleCommandArguments(init, 'garbage').diagnostics[0].code).toEqual('invalid');

        const ssh = getAgentConsoleCommandDefinition('/ssh')!;
        expect(parseAgentConsoleCommandArguments(ssh, '').diagnostics).toEqual([]);
        ['list', 'ls', 'help', '?'].forEach(action => {
            expect(parseAgentConsoleCommandArguments(ssh, action).resolved).toEqual([action]);
        });
        expect(parseAgentConsoleCommandArguments(ssh, 'connect web').resolved).toEqual(['connect', 'web']);
        expect(parseAgentConsoleCommandArguments(ssh, 'disconnect web').resolved).toEqual(['disconnect', 'web']);
        expect(parseAgentConsoleCommandArguments(ssh, 'shell web').resolved).toEqual(['shell', 'web']);
        expect(parseAgentConsoleCommandArguments(ssh, 'forward web 127.0.0.1 3306').resolved).toEqual(['forward', 'web 127.0.0.1 3306']);
        expect(parseAgentConsoleCommandArguments(ssh, 'bogus').diagnostics[0].code).toEqual('invalid');
    }

    @Test('final cluster: /ide /attach accept a variadic free-form tail')
    finalClusterVariadicFreeFormContracts() {
        const ide = getAgentConsoleCommandDefinition('/ide')!;
        expect(parseAgentConsoleCommandArguments(ide, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(ide, 'refresh').resolved).toEqual(['refresh']);
        expect(parseAgentConsoleCommandArguments(ide, 'detach').resolved).toEqual(['detach']);
        expect(parseAgentConsoleCommandArguments(ide, 'what file is active').resolved).toEqual(['what file is active']);

        const attach = getAgentConsoleCommandDefinition('/attach')!;
        expect(parseAgentConsoleCommandArguments(attach, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(attach, 'cat.png').resolved).toEqual(['cat.png']);
        expect(parseAgentConsoleCommandArguments(attach, 'clear').resolved).toEqual(['clear']);
        expect(parseAgentConsoleCommandArguments(attach, '"cat photo.png"').resolved).toEqual(['cat photo.png']);
    }

    @Test('final cluster: /jobs /tasks /retry /rollback accept a single optional task id')
    finalClusterSingleTaskIdContracts() {
        ['/jobs', '/tasks', '/retry', '/rollback'].forEach(name => {
            const def = getAgentConsoleCommandDefinition(name)!;
            expect(parseAgentConsoleCommandArguments(def, '').diagnostics).toEqual([]);
            expect(parseAgentConsoleCommandArguments(def, 'task-1').resolved).toEqual(['task-1']);
            expect(parseAgentConsoleCommandArguments(def, 'task-1 extra').diagnostics[0].code).toEqual('extra');
        });
    }

    @Test('final cluster: /memories validates its verb enum then joins the tail')
    finalClusterMemoriesContracts() {
        const memories = getAgentConsoleCommandDefinition('/memories')!;
        expect(parseAgentConsoleCommandArguments(memories, '').diagnostics).toEqual([]);
        ['list', 'injected', 'add', 'remove', 'rm', 'on', 'off'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(memories, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(memories, 'add language=TypeScript').resolved).toEqual(['add', 'language=TypeScript']);
        expect(parseAgentConsoleCommandArguments(memories, 'remove language').resolved).toEqual(['remove', 'language']);
        expect(parseAgentConsoleCommandArguments(memories, 'maybe').diagnostics[0].code).toEqual('invalid');
    }

    @Test('final cluster: /goal keeps a variadic free-form tail')
    finalClusterGoalContracts() {
        const goal = getAgentConsoleCommandDefinition('/goal')!;
        expect(parseAgentConsoleCommandArguments(goal, '').diagnostics).toEqual([]);
        expect(parseAgentConsoleCommandArguments(goal, 'create Release | Ship version 1 | tests pass; build clean').resolved)
            .toEqual(['create Release | Ship version 1 | tests pass; build clean']);
        expect(parseAgentConsoleCommandArguments(goal, 'show').resolved).toEqual(['show']);
        expect(parseAgentConsoleCommandArguments(goal, 'goal-1').resolved).toEqual(['goal-1']);
    }

    @Test('final cluster: /ps validates its verb enum (show/stop/undo + filters) and joins the tail')
    finalClusterPsContracts() {
        const ps = getAgentConsoleCommandDefinition('/ps')!;
        expect(parseAgentConsoleCommandArguments(ps, '').diagnostics).toEqual([]);
        ['show', 'stop', 'undo', 'current', 'all', 'running', 'completed', 'failed', 'cancelled'].forEach(v =>
            expect(parseAgentConsoleCommandArguments(ps, v).diagnostics).toEqual([]));
        expect(parseAgentConsoleCommandArguments(ps, 'stop bg-1 bg-2').resolved).toEqual(['stop', 'bg-1 bg-2']);
        expect(parseAgentConsoleCommandArguments(ps, 'list').diagnostics[0].code).toEqual('invalid');
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

    @Test('session-nav handlers consume resolved args for /session /new /title /approve /deny /copy /tools')
    async sessionNavClusterHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            refreshSessions: async () => { received.push('refresh'); },
            openSession: async (id: string | undefined) => { received.push(`open:${id}`); },
            runTitleCommand: async (arg: string) => { received.push(`titleCmd:${arg}`); return true; },
            sessionService: {
                setSessionTitle: async (sid: string, title: string) => { received.push(`setTitle:${sid}:${title}`); }
            },
            state: {
                sessionId: 'active-1',
                input: 'my input',
                workspace: 'ws-1',
                provider: 'p1',
                model: 'm1',
                setTitle: () => {},
                closeReview: () => {},
                closeGitSnapshotDetail: () => {},
                setMessagesFocused: () => {},
                setSessionsFocused: () => {},
                setToolsFocused: () => {},
                tools: [],
                sessions: []
            },
            updateTerminalTitle: () => {},
            pushCommandOutput: () => {},
            notify: (n: string) => { received.push(`notify:${n}`); },
            getPendingApprovals: async () => {
                received.push('pend');
                return [
                    { id: 'req-1', toolName: 'weather', reason: 'check' },
                    { id: 'req-2', toolName: 'files', reason: 'write' }
                ];
            },
            applyApprovalDecision: async (action: string, id: string) => { received.push(`apply:${action}:${id}`); return true; },
            runApproveRetryCommand: async () => { received.push('retryCmd'); return true; },
            copyFocusedTextActionHandler: async (text: string, kind: string) => { received.push(`copy:${kind}:${text}`); },
            activateSelectedToolActionHandler: async (arg: string) => { received.push(`tools:${arg}`); return true; }
        } as any;
        const metaFor = (command: string, resolved: string[]) => ({
            command, matches: [command],
            parsedArgs: { values: resolved, resolved, diagnostics: [] }
        });
        await COMMAND_HANDLERS['/session'](ctx, 'garbage', metaFor('/session', ['sess-7']));
        await COMMAND_HANDLERS['/new'](ctx, 'garbage', metaFor('/new', ['sess-8']));
        await COMMAND_HANDLERS['/title'](ctx, 'garbage', metaFor('/title', ['my cool title']));
        await COMMAND_HANDLERS['/title'](ctx, 'garbage', metaFor('/title', ['list']));
        await COMMAND_HANDLERS['/approve'](ctx, 'garbage', metaFor('/approve', ['req-1']));
        await COMMAND_HANDLERS['/approve'](ctx, 'garbage', metaFor('/approve', ['retry']));
        await COMMAND_HANDLERS['/deny'](ctx, 'garbage', metaFor('/deny', ['req-2']));
        await COMMAND_HANDLERS['/copy'](ctx, 'garbage', metaFor('/copy', ['workspace']));
        await COMMAND_HANDLERS['/copy'](ctx, 'garbage', metaFor('/copy', ['input']));
        await COMMAND_HANDLERS['/copy'](ctx, 'garbage', metaFor('/copy', ['session']));
        await COMMAND_HANDLERS['/copy'](ctx, 'garbage', metaFor('/copy', ['model']));
        await COMMAND_HANDLERS['/tools'](ctx, 'garbage', metaFor('/tools', ['bash*']));
        expect(received).toEqual([
            'refresh', 'open:sess-7',
            'open:sess-8',
            'setTitle:active-1:my cool title', 'refresh',
            'titleCmd:list',
            'pend', 'apply:approve:req-1', 'notify:Approved weather (req-1).',
            'retryCmd',
            'pend', 'apply:deny:req-2', 'notify:Denied files (req-2).',
            'copy:workspace:ws-1', 'copy:input:my input', 'copy:session:active-1', 'copy:model:p1 / m1',
            'tools:bash*'
        ]);
    }

    @Test('session-nav handlers fall back to raw args without parsedArgs')
    async sessionNavClusterHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            refreshSessions: async () => { received.push('refresh'); },
            openSession: async (id: string | undefined) => { received.push(`open:${id}`); },
            sessionService: {
                setSessionTitle: async (sid: string, title: string) => { received.push(`setTitle:${sid}:${title}`); }
            },
            state: {
                sessionId: 'active-1', input: 'in', workspace: 'ws', provider: 'p', model: 'm',
                setTitle: () => {}, closeReview: () => {}, closeGitSnapshotDetail: () => {},
                setMessagesFocused: () => {}, setSessionsFocused: () => {}, setToolsFocused: () => {},
                tools: [], sessions: []
            },
            updateTerminalTitle: () => {},
            pushCommandOutput: () => {},
            notify: (n: string) => { received.push(`notify:${n}`); },
            getPendingApprovals: async () => {
                received.push('pend');
                return [{ id: 'req-raw', toolName: 'weather', reason: 'r' }];
            },
            applyApprovalDecision: async (action: string, id: string) => { received.push(`apply:${action}:${id}`); return true; },
            copyFocusedTextActionHandler: async (text: string, kind: string) => { received.push(`copy:${kind}:${text}`); },
            activateSelectedToolActionHandler: async (arg: string) => { received.push(`tools:${arg}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/session'](ctx, 'sess-raw', { command: '/session', matches: ['/session'] });
        await COMMAND_HANDLERS['/new'](ctx, 'sess-raw2', { command: '/new', matches: ['/new'] });
        await COMMAND_HANDLERS['/title'](ctx, 'my raw title', { command: '/title', matches: ['/title'] });
        await COMMAND_HANDLERS['/approve'](ctx, 'req-raw', { command: '/approve', matches: ['/approve'] });
        await COMMAND_HANDLERS['/deny'](ctx, 'req-raw', { command: '/deny', matches: ['/deny'] });
        await COMMAND_HANDLERS['/copy'](ctx, 'workspace', { command: '/copy', matches: ['/copy'] });
        await COMMAND_HANDLERS['/tools'](ctx, 'grep', { command: '/tools', matches: ['/tools'] });
        expect(received).toEqual([
            'refresh', 'open:sess-raw',
            'open:sess-raw2',
            'setTitle:active-1:my raw title', 'refresh',
            'pend', 'apply:approve:req-raw', 'notify:Approved weather (req-raw).',
            'pend', 'apply:deny:req-raw', 'notify:Denied weather (req-raw).',
            'copy:workspace:ws',
            'tools:grep'
        ]);
    }

    @Test('extra token in /session preserves the draft for correction')
    async sessionNavExtraTokenPreservesDraft() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/session a b');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.input).toEqual('/session a b');
        expect(state.notice).toContain('Unexpected');
    }

    @Test('invalid /copy target preserves the draft for correction')
    async copyInvalidTargetPreservesDraft() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/copy bogus');
        expect(state.latestCommandExecution?.status).toEqual('failed');
        expect(state.input).toEqual('/copy bogus');
        expect(state.notice).toContain('Invalid');
    }

    @Test('delegation-cluster handlers consume resolved args')
    async delegationClusterHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            openUsage: async (a?: string) => { received.push(`usage:${a}`); return true; },
            openSummaryQualityRecords: async (p?: string) => { received.push(`quality-list:${p}`); return true; },
            parseSummaryQualityTrendArgs: (rest: string) => { received.push(`quality-trend-parse:${rest}`); return { provider: 'c1', bucketSize: 7, maxBuckets: 30 }; },
            openSummaryQualityTrend: async (p?: string, b?: number, m?: number) => { received.push(`quality-trend:${p}:${b}:${m}`); return true; },
            openCompactionHistory: async (sid?: string) => { received.push(`compactions:${sid}`); return true; },
            parseCompactionHistoryTrendArgs: (rest: string) => { received.push(`compactions-trend-parse:${rest}`); return { sessionId: 's1', bucketSize: 7, maxBuckets: 30 }; },
            openCompactionHistoryTrend: async (sid?: string, b?: number, m?: number) => { received.push(`compactions-trend:${sid}:${b}:${m}`); return true; },
            sessionService: {
                compactSession: async (_sid: string, reason?: string) => { received.push(`compact:${reason}`); return { compacted: false }; }
            },
            state: { sessionId: 'active-1' },
            notify: (n: string) => { received.push(`notify:${n}`); },
            openTurnDiagnostics: async (sid?: string) => { received.push(`diagnostics:${sid}`); return true; },
            openTurnDiagnosticsList: async (sid?: string) => { received.push(`diagnostics-list:${sid}`); return true; },
            parseTurnDiagnosticsTrendArgs: (rest: string) => { received.push(`diagnostics-trend-parse:${rest}`); return { sessionId: 's1', bucketSize: 7, maxBuckets: 30 }; },
            openTurnDiagnosticsTrend: async (sid?: string, b?: number, m?: number) => { received.push(`diagnostics-trend:${sid}:${b}:${m}`); return true; },
            openDelegationTree: async (sid?: string, status?: string, depth?: number) => { received.push(`tree:${sid ?? ''}:${status ?? ''}:${depth ?? ''}`); return true; },
            openDelegationLineage: async (sid?: string) => { received.push(`lineage:${sid}`); return true; },
            runDelegationModeCommand: async (cmd: string) => { received.push(`mode:${cmd}`); return true; },
            openDelegationList: async (sid?: string) => { received.push(`delegation-list:${sid}`); return true; },
            openHarnessAudit: async (sid?: string) => { received.push(`audit:${sid}`); return true; },
            openHarnessProfile: async (s?: string) => { received.push(`profile:${s}`); return true; }
        } as any;
        const metaFor = (command: string, resolved: string[]) => ({
            command, matches: [command],
            parsedArgs: { values: resolved, resolved, diagnostics: [] }
        });
        await COMMAND_HANDLERS['/usage'](ctx, 'garbage', metaFor('/usage', ['daily s1']));
        await COMMAND_HANDLERS['/quality'](ctx, 'garbage', metaFor('/quality', ['list client-1']));
        await COMMAND_HANDLERS['/quality'](ctx, 'garbage', metaFor('/quality', ['trend c1 7 30']));
        await COMMAND_HANDLERS['/compactions'](ctx, 'garbage', metaFor('/compactions', ['sess-x']));
        await COMMAND_HANDLERS['/compactions'](ctx, 'garbage', metaFor('/compactions', ['trend s1 7 30']));
        await COMMAND_HANDLERS['/compact'](ctx, 'garbage', metaFor('/compact', ['too long']));
        await COMMAND_HANDLERS['/diagnostics'](ctx, 'garbage', metaFor('/diagnostics', ['list sid']));
        await COMMAND_HANDLERS['/diagnostics'](ctx, 'garbage', metaFor('/diagnostics', ['sess-d']));
        await COMMAND_HANDLERS['/diagnostics'](ctx, 'garbage', metaFor('/diagnostics', ['trend s1 7 30']));
        await COMMAND_HANDLERS['/delegation'](ctx, 'garbage', metaFor('/delegation', ['tree s1 2']));
        await COMMAND_HANDLERS['/delegation'](ctx, 'garbage', metaFor('/delegation', ['lineage s1']));
        await COMMAND_HANDLERS['/delegation'](ctx, 'garbage', metaFor('/delegation', ['mode explicit']));
        await COMMAND_HANDLERS['/delegation'](ctx, 'garbage', metaFor('/delegation', ['sess-filter']));
        await COMMAND_HANDLERS['/harness'](ctx, 'garbage', metaFor('/harness', ['audit s1']));
        await COMMAND_HANDLERS['/harness'](ctx, 'garbage', metaFor('/harness', ['profile list']));
        expect(received).toEqual([
            'usage:daily s1',
            'quality-list:client-1',
            'quality-trend-parse: c1 7 30', 'quality-trend:c1:7:30',
            'compactions:sess-x',
            'compactions-trend-parse: s1 7 30', 'compactions-trend:s1:7:30',
            'compact:too long', 'notify:Nothing to compact: history already within budget.',
            'diagnostics-list:sid',
            'diagnostics:sess-d',
            'diagnostics-trend-parse: s1 7 30', 'diagnostics-trend:s1:7:30',
            'tree:s1:2:', 'lineage:s1', 'mode:explicit', 'delegation-list:sess-filter',
            'audit:s1', 'profile:list'
        ]);
    }

    @Test('delegation-cluster handlers fall back to raw args without parsedArgs')
    async delegationClusterHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            openUsage: async (a?: string) => { received.push(`usage:${a}`); return true; },
            openSummaryQualityRecords: async (p?: string) => { received.push(`quality-list:${p}`); return true; },
            parseSummaryQualityTrendArgs: (rest: string) => { received.push(`quality-trend-parse:${rest}`); return { provider: 'c1', bucketSize: 7, maxBuckets: 30 }; },
            openSummaryQualityTrend: async (p?: string, b?: number, m?: number) => { received.push(`quality-trend:${p}:${b}:${m}`); return true; },
            openCompactionHistory: async (sid?: string) => { received.push(`compactions:${sid}`); return true; },
            parseCompactionHistoryTrendArgs: (rest: string) => { received.push(`compactions-trend-parse:${rest}`); return { sessionId: 's1', bucketSize: 7, maxBuckets: 30 }; },
            openCompactionHistoryTrend: async (sid?: string, b?: number, m?: number) => { received.push(`compactions-trend:${sid}:${b}:${m}`); return true; },
            sessionService: {
                compactSession: async (_sid: string, reason?: string) => { received.push(`compact:${reason}`); return { compacted: false }; }
            },
            state: { sessionId: 'active-1' },
            notify: () => {},
            openTurnDiagnostics: async (sid?: string) => { received.push(`diagnostics:${sid}`); return true; },
            openTurnDiagnosticsList: async (sid?: string) => { received.push(`diagnostics-list:${sid}`); return true; },
            parseTurnDiagnosticsTrendArgs: (rest: string) => { received.push(`diagnostics-trend-parse:${rest}`); return { sessionId: 's1', bucketSize: 7, maxBuckets: 30 }; },
            openTurnDiagnosticsTrend: async (sid?: string, b?: number, m?: number) => { received.push(`diagnostics-trend:${sid}:${b}:${m}`); return true; },
            openDelegationTree: async (sid?: string, status?: string, depth?: number) => { received.push(`tree:${sid ?? ''}:${status ?? ''}:${depth ?? ''}`); return true; },
            openDelegationLineage: async (sid?: string) => { received.push(`lineage:${sid}`); return true; },
            runDelegationModeCommand: async (cmd: string) => { received.push(`mode:${cmd}`); return true; },
            openDelegationList: async (sid?: string) => { received.push(`delegation-list:${sid}`); return true; },
            openHarnessAudit: async (sid?: string) => { received.push(`audit:${sid}`); return true; },
            openHarnessProfile: async (s?: string) => { received.push(`profile:${s}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/usage'](ctx, 'daily raw', { command: '/usage', matches: ['/usage'] });
        await COMMAND_HANDLERS['/quality'](ctx, 'list raw-provider', { command: '/quality', matches: ['/quality'] });
        await COMMAND_HANDLERS['/quality'](ctx, 'trend rp 7 30', { command: '/quality', matches: ['/quality'] });
        await COMMAND_HANDLERS['/compactions'](ctx, 'raw-sess', { command: '/compactions', matches: ['/compactions'] });
        await COMMAND_HANDLERS['/compactions'](ctx, 'trend rs 7 30', { command: '/compactions', matches: ['/compactions'] });
        await COMMAND_HANDLERS['/compact'](ctx, 'raw reason', { command: '/compact', matches: ['/compact'] });
        await COMMAND_HANDLERS['/diagnostics'](ctx, 'raw-sid', { command: '/diagnostics', matches: ['/diagnostics'] });
        await COMMAND_HANDLERS['/delegation'](ctx, 'tree rs 3', { command: '/delegation', matches: ['/delegation'] });
        await COMMAND_HANDLERS['/delegation'](ctx, 'lineage rs2', { command: '/delegation', matches: ['/delegation'] });
        await COMMAND_HANDLERS['/delegation'](ctx, 'mode proactive', { command: '/delegation', matches: ['/delegation'] });
        await COMMAND_HANDLERS['/delegation'](ctx, 'raw-filter', { command: '/delegation', matches: ['/delegation'] });
        await COMMAND_HANDLERS['/harness'](ctx, 'audit rs', { command: '/harness', matches: ['/harness'] });
        await COMMAND_HANDLERS['/harness'](ctx, 'profile current', { command: '/harness', matches: ['/harness'] });
        expect(received).toEqual([
            'usage:daily raw',
            'quality-list:raw-provider',
            'quality-trend-parse: rp 7 30', 'quality-trend:c1:7:30',
            'compactions:raw-sess',
            'compactions-trend-parse: rs 7 30', 'compactions-trend:s1:7:30',
            'compact:raw reason',
            'diagnostics:raw-sid',
            'tree:rs:3:', 'lineage:rs2', 'mode:proactive', 'delegation-list:raw-filter',
            'audit:rs', 'profile:current'
        ]);
    }

    @Test('core-mode handlers consume resolved args for /vim /plan /archetype /experimental /keymap /permissions')
    async coreModeClusterHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            runVimCommand: async (arg: string) => { received.push(`vim:${arg}`); return true; },
            runPlanCommand: async (arg: string) => { received.push(`plan:${arg}`); return true; },
            runArchetypeCommand: async (arg: string) => { received.push(`archetype:${arg}`); return true; },
            runExperimentalCommand: async (arg: string) => { received.push(`experimental:${arg}`); return true; },
            runKeymapCommand: async (arg: string) => { received.push(`keymap:${arg}`); return true; },
            runPermissionsCommand: async (arg: string) => { received.push(`permissions:${arg}`); return true; }
        } as any;
        const metaFor = (command: string, resolved: string[]) => ({
            command, matches: [command],
            parsedArgs: { values: resolved, resolved, diagnostics: [] }
        });
        await COMMAND_HANDLERS['/vim'](ctx, 'garbage', metaFor('/vim', ['on']));
        await COMMAND_HANDLERS['/plan'](ctx, 'garbage', metaFor('/plan', ['off']));
        await COMMAND_HANDLERS['/archetype'](ctx, 'garbage', metaFor('/archetype', ['build']));
        await COMMAND_HANDLERS['/experimental'](ctx, 'garbage', metaFor('/experimental', ['feature', 'on']));
        await COMMAND_HANDLERS['/keymap'](ctx, 'garbage', metaFor('/keymap', ['global set ctrl+c copy']));
        await COMMAND_HANDLERS['/permissions'](ctx, 'garbage', metaFor('/permissions', ['readonly', 'on']));
        expect(received).toEqual([
            'vim:on',
            'plan:off',
            'archetype:build',
            'experimental:feature on',
            'keymap:global set ctrl+c copy',
            'permissions:readonly on'
        ]);
    }

    @Test('core-mode handlers fall back to raw args without parsedArgs')
    async coreModeClusterHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            runVimCommand: async (arg: string) => { received.push(`vim:${arg}`); return true; },
            runPlanCommand: async (arg: string) => { received.push(`plan:${arg}`); return true; },
            runArchetypeCommand: async (arg: string) => { received.push(`archetype:${arg}`); return true; },
            runExperimentalCommand: async (arg: string) => { received.push(`experimental:${arg}`); return true; },
            runKeymapCommand: async (arg: string) => { received.push(`keymap:${arg}`); return true; },
            runPermissionsCommand: async (arg: string) => { received.push(`permissions:${arg}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/vim'](ctx, 'on', { command: '/vim', matches: ['/vim'] });
        await COMMAND_HANDLERS['/plan'](ctx, 'off', { command: '/plan', matches: ['/plan'] });
        await COMMAND_HANDLERS['/archetype'](ctx, 'build', { command: '/archetype', matches: ['/archetype'] });
        await COMMAND_HANDLERS['/experimental'](ctx, 'feature on', { command: '/experimental', matches: ['/experimental'] });
        await COMMAND_HANDLERS['/keymap'](ctx, 'global set ctrl+c copy', { command: '/keymap', matches: ['/keymap'] });
        await COMMAND_HANDLERS['/permissions'](ctx, 'readonly on', { command: '/permissions', matches: ['/permissions'] });
        expect(received).toEqual([
            'vim:on',
            'plan:off',
            'archetype:build',
            'experimental:feature on',
            'keymap:global set ctrl+c copy',
            'permissions:readonly on'
        ]);
    }

    @Test('session-tools handlers consume resolved args for /git-snapshots /export /cd /init /ssh')
    async sessionToolsHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            notifyBusyState: () => {},
            runGitSnapshotsCommand: async (arg: string) => { received.push(`gitSnap:${arg}`); return true; },
            runExportCommand: async (arg: string) => { received.push(`export:${arg}`); return true; },
            runCdCommand: (arg: string) => { received.push(`cd:${arg}`); },
            runInitCommand: async (arg: string) => { received.push(`init:${arg}`); return true; },
            runSshCommand: async (arg: string) => { received.push(`ssh:${arg}`); return true; }
        } as any;
        const metaFor = (command: string, resolved: string[]) => ({
            command, matches: [command],
            parsedArgs: { values: resolved, resolved, diagnostics: [] }
        });
        await COMMAND_HANDLERS['/git-snapshots'](ctx, 'garbage', metaFor('/git-snapshots', ['diff', 'msg-1']));
        await COMMAND_HANDLERS['/export'](ctx, 'garbage', metaFor('/export', ['jsonl sess-1 out.json']));
        await COMMAND_HANDLERS['/cd'](ctx, 'garbage', metaFor('/cd', ['my dir']));
        await COMMAND_HANDLERS['/init'](ctx, 'garbage', metaFor('/init', ['--force']));
        await COMMAND_HANDLERS['/ssh'](ctx, 'garbage', metaFor('/ssh', ['forward', 'web 127.0.0.1 3306']));
        expect(received).toEqual([
            'gitSnap:diff msg-1',
            'export:jsonl sess-1 out.json',
            'cd:my dir',
            'init:--force',
            'ssh:forward web 127.0.0.1 3306'
        ]);
    }

    @Test('session-tools handlers fall back to raw args without parsedArgs')
    async sessionToolsHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            notifyBusyState: () => {},
            runGitSnapshotsCommand: async (arg: string) => { received.push(`gitSnap:${arg}`); return true; },
            runExportCommand: async (arg: string) => { received.push(`export:${arg}`); return true; },
            runCdCommand: (arg: string) => { received.push(`cd:${arg}`); },
            runInitCommand: async (arg: string) => { received.push(`init:${arg}`); return true; },
            runSshCommand: async (arg: string) => { received.push(`ssh:${arg}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/git-snapshots'](ctx, 'diff raw', { command: '/git-snapshots', matches: ['/git-snapshots'] });
        await COMMAND_HANDLERS['/export'](ctx, 'jsonl raw', { command: '/export', matches: ['/export'] });
        await COMMAND_HANDLERS['/cd'](ctx, 'raw dir', { command: '/cd', matches: ['/cd'] });
        await COMMAND_HANDLERS['/init'](ctx, '--force', { command: '/init', matches: ['/init'] });
        await COMMAND_HANDLERS['/ssh'](ctx, 'connect web', { command: '/ssh', matches: ['/ssh'] });
        expect(received).toEqual([
            'gitSnap:diff raw',
            'export:jsonl raw',
            'cd:raw dir',
            'init:--force',
            'ssh:connect web'
        ]);
    }

    @Test('canonical args: /vim off then on toggles vim mode (pure-state handler)')
    async vimCanonicalToggle() {
        const { state, component } = createConsole();
        await (component as any).handleCommand('/vim off');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.vimMode).toEqual(false);
        await (component as any).handleCommand('/vim on');
        expect(state.latestCommandExecution?.status).toEqual('succeeded');
        expect(state.vimMode).toEqual(true);
    }

    @Test('final-cluster handlers consume resolved args for /ide /attach /jobs /tasks /memories /goal /retry /rollback /ps')
    async finalClusterHandlersConsumeCanonicalArgs() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            notifyBusyState: () => {},
            runIdeCommand: async (arg: string) => { received.push(`ide:${arg}`); return true; },
            runAttachCommand: async (arg: string) => { received.push(`attach:${arg}`); return true; },
            openScheduledJobsDashboard: async (arg?: string) => { received.push(`jobs:${arg}`); return true; },
            openCodingTaskInspector: async (arg?: string) => { received.push(`tasks:${arg}`); return true; },
            runMemoriesCommand: async (arg: string) => { received.push(`memories:${arg}`); return true; },
            runGoalCommand: async (arg: string) => { received.push(`goal:${arg}`); return true; },
            retryFailedCodingTask: async (arg?: string) => { received.push(`retry:${arg}`); return true; },
            rollbackCodingTask: async (arg?: string) => { received.push(`rollback:${arg}`); return true; },
            runBackgroundTasksCommand: async (arg: string) => { received.push(`ps:${arg}`); return true; }
        } as any;
        const metaFor = (command: string, resolved: string[]) => ({
            command, matches: [command],
            parsedArgs: { values: resolved, resolved, diagnostics: [] }
        });
        await COMMAND_HANDLERS['/ide'](ctx, 'garbage', metaFor('/ide', ['what file is active']));
        await COMMAND_HANDLERS['/attach'](ctx, 'garbage', metaFor('/attach', ['cat.png']));
        await COMMAND_HANDLERS['/attach'](ctx, 'garbage', metaFor('/attach', ['clear']));
        await COMMAND_HANDLERS['/jobs'](ctx, 'garbage', metaFor('/jobs', ['job-1']));
        await COMMAND_HANDLERS['/tasks'](ctx, 'garbage', metaFor('/tasks', ['task-1']));
        await COMMAND_HANDLERS['/memories'](ctx, 'garbage', metaFor('/memories', ['add', 'language=TypeScript']));
        await COMMAND_HANDLERS['/memories'](ctx, 'garbage', metaFor('/memories', ['list']));
        await COMMAND_HANDLERS['/goal'](ctx, 'garbage', metaFor('/goal', ['create Release | Ship | tests pass; build clean']));
        await COMMAND_HANDLERS['/retry'](ctx, 'garbage', metaFor('/retry', ['task-1']));
        await COMMAND_HANDLERS['/rollback'](ctx, 'garbage', metaFor('/rollback', ['task-1']));
        await COMMAND_HANDLERS['/ps'](ctx, 'garbage', metaFor('/ps', ['stop', 'bg-x']));
        await COMMAND_HANDLERS['/ps'](ctx, 'garbage', metaFor('/ps', ['all']));
        expect(received).toEqual([
            'ide:what file is active',
            'attach:cat.png',
            'attach:clear',
            'jobs:job-1',
            'tasks:task-1',
            'memories:add language=TypeScript',
            'memories:list',
            'goal:create Release | Ship | tests pass; build clean',
            'retry:task-1',
            'rollback:task-1',
            'ps:stop bg-x',
            'ps:all'
        ]);
    }

    @Test('final-cluster handlers fall back to raw args without parsedArgs')
    async finalClusterHandlerRawFallback() {
        const { COMMAND_HANDLERS } = require('../src/AgentConsoleCommandHandlers');
        const received: string[] = [];
        const ctx = {
            isTurnInProgress: () => false,
            notifyBusyState: () => {},
            runIdeCommand: async (arg: string) => { received.push(`ide:${arg}`); return true; },
            runAttachCommand: async (arg: string) => { received.push(`attach:${arg}`); return true; },
            openScheduledJobsDashboard: async (arg?: string) => { received.push(`jobs:${arg}`); return true; },
            openCodingTaskInspector: async (arg?: string) => { received.push(`tasks:${arg}`); return true; },
            runMemoriesCommand: async (arg: string) => { received.push(`memories:${arg}`); return true; },
            runGoalCommand: async (arg: string) => { received.push(`goal:${arg}`); return true; },
            retryFailedCodingTask: async (arg?: string) => { received.push(`retry:${arg}`); return true; },
            rollbackCodingTask: async (arg?: string) => { received.push(`rollback:${arg}`); return true; },
            runBackgroundTasksCommand: async (arg: string) => { received.push(`ps:${arg}`); return true; }
        } as any;
        await COMMAND_HANDLERS['/ide'](ctx, 'refresh', { command: '/ide', matches: ['/ide'] });
        await COMMAND_HANDLERS['/attach'](ctx, 'raw.png', { command: '/attach', matches: ['/attach'] });
        await COMMAND_HANDLERS['/jobs'](ctx, 'raw-job', { command: '/jobs', matches: ['/jobs'] });
        await COMMAND_HANDLERS['/tasks'](ctx, 'raw-task', { command: '/tasks', matches: ['/tasks'] });
        await COMMAND_HANDLERS['/memories'](ctx, 'off', { command: '/memories', matches: ['/memories'] });
        await COMMAND_HANDLERS['/goal'](ctx, 'show goal-1', { command: '/goal', matches: ['/goal'] });
        await COMMAND_HANDLERS['/retry'](ctx, 'raw-retry', { command: '/retry', matches: ['/retry'] });
        await COMMAND_HANDLERS['/rollback'](ctx, 'raw-rollback', { command: '/rollback', matches: ['/rollback'] });
        await COMMAND_HANDLERS['/ps'](ctx, 'stop raw-bg', { command: '/ps', matches: ['/ps'] });
        expect(received).toEqual([
            'ide:refresh',
            'attach:raw.png',
            'jobs:raw-job',
            'tasks:raw-task',
            'memories:off',
            'goal:show goal-1',
            'retry:raw-retry',
            'rollback:raw-rollback',
            'ps:stop raw-bg'
        ]);
    }
}
