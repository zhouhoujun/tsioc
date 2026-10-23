import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    applyAgentConsoleSuggestion,
    getAgentConsoleArgumentRange,
    getAgentConsoleInputTokenRange,
    getAgentConsoleMentionCandidates,
    parseAgentConsoleMentionNames,
    rankAgentConsoleCommandMatches,
    resolveAgentConsoleArgumentCandidates,
    resolveAgentConsoleInputSuggestions
} from '../src/AgentConsoleSuggestions';
import { enrichPromptWithMentions } from '../src/AgentConsolePromptMentions';
import { AgentConsoleWorkspaceMentionsProvider } from '../src/AgentConsoleWorkspaceMentions';

/**
 * Real TUI findings in the `/` and `@` menus:
 *  - `/se` listed `/resume`, `/side`, `/share`, `/statusline`, `/send` because the
 *    inline menu used subsequence matching;
 *  - typing `@tim` put the `@time` tool before `timer-system/...`, and Enter on a
 *    tool mention submits instead of inserting the file;
 *  - command group labels (`[核心]`) and mention kinds (`folder`/`file`) were not
 *    localized.
 */
@Suite('/ and @ suggestion menus')
export class SuggestionMenuTest {
    @Test('command matches prefer prefix/substring over subsequence')
    async commandRanking() {
        const commands = ['/sessions', '/session', '/resume', '/side', '/share', '/sections', '/search', '/statusline', '/send', '/settings'];
        const ranked = rankAgentConsoleCommandMatches(commands, '/se');
        expect(ranked).toContain('/sessions');
        expect(ranked).toContain('/search');
        expect(ranked).not.toContain('/resume');
        expect(ranked).not.toContain('/side');
        expect(ranked).not.toContain('/statusline');
        // exact name still wins
        expect(rankAgentConsoleCommandMatches(commands, '/sessions')[0]).toEqual('/sessions');
    }

    @Test('fuzzy fallback still finds distant matches')
    async fuzzyFallback() {
        expect(rankAgentConsoleCommandMatches(['/compact'], '/cmp')).toEqual(['/compact']);
    }

    @Test('@ puts workspace files before tool mentions')
    async mentionOrdering() {
        const tools: any[] = [{ name: 'time' }, { name: 'terminal' }];
        const options = resolveAgentConsoleInputSuggestions('@tim', '@tim'.length, [], tools, [
            { label: '@timer-system/', value: '@timer-system/', description: 'folder' },
            { label: '@timer-system/src/timer.js', value: '@timer-system/src/timer.js', description: 'file' }
        ]);
        const values = options.map(option => option.value);
        expect(values.slice(0, 2)).toEqual(['@timer-system/', '@timer-system/src/timer.js']);
        expect(values).toContain('@time');
        expect(values.indexOf('@time')).toBeGreaterThan(values.indexOf('@timer-system/'));
    }

    @Test('group labels and mention kinds follow the supplied locale')
    async localizedLabels() {
        const options = resolveAgentConsoleInputSuggestions('/se', '/se'.length, ['/sessions'], [], [
            { label: '@timer-system/', value: '@timer-system/', description: 'folder' }
        ], {
            groupLabels: { session: '会话' },
            mentionKinds: { folder: '文件夹' }
        });
        expect(options[0].description).toContain('[会话]');
        const mention = resolveAgentConsoleInputSuggestions('@', 1, [], [], [
            { label: '@timer-system/', value: '@timer-system/', description: 'folder' }
        ], { mentionKinds: { folder: '文件夹' } });
        expect(mention.find(option => option.value === '@timer-system/')?.description).toEqual('文件夹');
    }

    @Test('pseudo mentions stay first and tools appear once the query is specific')
    async pseudoMentionsFirst() {
        const tools: any[] = [{ name: 'canvas' }];
        const bare = resolveAgentConsoleInputSuggestions('@', 1, [], tools, []).map(option => option.value);
        expect(bare.slice(0, 4)).toEqual(['@workspace', '@model', '@tools', '@session']);
        // 64 tool mentions used to crowd the first screen of a bare `@`.
        expect(bare).not.toContain('@canvas');
        const typed = resolveAgentConsoleInputSuggestions('@ca', 3, [], tools, []).map(option => option.value);
        expect(typed).toContain('@canvas');
        expect(getAgentConsoleMentionCandidates(tools)).toContain('@canvas');
    }
}

/** The async workspace suggestions must not steal the highlight from the best match. */
@Suite('@ menu keeps the best match selected after async file suggestions')
export class MentionSelectionTest {
    @Test('typing @tim keeps the first file selected, not the tool mention')
    async asyncSuggestionsKeepBestMatch() {
        const { AgentConsoleSessionState } = require('../src');
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1', workspace: '/tmp/ws' } as any);
        (state as any).workspaceMentionResolver = {
            resolveSuggestions: async () => ([
                { label: '@timer-system/', value: '@timer-system/', description: 'folder' },
                { label: '@timer-system/src/timer.js', value: '@timer-system/src/timer.js', description: 'file' }
            ])
        };
        (state as any).tools = [{ name: 'time' }];
        state.setInput('@tim', 4);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(state.selectMenu?.options[0]?.value).toEqual('@timer-system/');
        expect(state.selectMenu?.selectedIndex).toEqual(0);
    }
}

/** Tab completes the highlighted suggestion (the hint advertises `tab 补全`). */
@Suite('tab accepts the suggestion menu selection')
export class SuggestionTabTest {
    @Test('resolveMenuKey treats a raw tab as accept')
    async rawTabAccepts() {
        const { AgentConsoleSessionState } = require('../src');
        const state = new AgentConsoleSessionState();
        const overlay = (state as any).focusLayers.overlay;
        expect(overlay.resolveMenuKey('', '\t', 3)).toEqual({ action: 'complete' });
        expect(overlay.resolveMenuKey('tab', '', 3)).toEqual({ action: 'complete' });
        expect(overlay.resolveMenuKey('return', '', 3)).toEqual({ action: 'accept' });
    }

    @Test('decoded tab fills the highlighted command')
    async decodedTabCompletesCommand() {
        const { AgentConsoleSessionState } = require('../src');
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' } as any);
        state.setInput('/se', 3);
        const result: any = await (state as any).processDecodedInput(
            { text: '\t', partial: false },
            '',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: { move: () => undefined, movePage: () => undefined, selectFirst: () => undefined, selectLast: () => undefined, setFocused: () => undefined }
            }
        );
        expect(result.handled).toEqual(true);
        expect(state.input.trim()).toEqual('/settings');
    }
}

/** A typo must not execute an unrelated command. */
@Suite('unknown slash commands do not offer unrelated commands')
export class UnknownCommandSuggestionTest {
    @Test('no match yields an empty menu; a bare slash still lists everything')
    async unknownCommandHasNoOptions() {
        const commands = ['/sessions', '/model', '/help'];
        expect(resolveAgentConsoleInputSuggestions('/nosuch', 7, commands, [], [])).toEqual([]);
        expect(resolveAgentConsoleInputSuggestions('/', 1, commands, [], []).map(option => option.value)).toEqual(commands);
    }

    @Test('decoded enter on an unknown command submits the text instead of a suggestion')
    async unknownCommandEnterSubmits() {
        const { AgentConsoleSessionState } = require('../src');
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' } as any);
        state.setInput('/nosuch', 7);
        expect(state.selectMenu).toBeUndefined();
        const result: any = await (state as any).processDecodedInput(
            { text: '\r', controlKey: 'return', partial: false },
            '',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: { move: () => undefined, movePage: () => undefined, selectFirst: () => undefined, selectLast: () => undefined, setFocused: () => undefined }
            }
        );
        expect(result.handled).toEqual(true);
        expect(result.action).toEqual('submit');
        expect(state.input).toEqual('/nosuch');
    }
}

/** The agent's own storage directory must not be offered as a mention. */
@Suite('workspace mentions skip the agent storage directory')
export class WorkspaceMentionIgnoreTest {
    @Test('.tsdi-agent is excluded while real folders stay')
    async ignoresAgentStorage() {
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const { AgentConsoleWorkspaceMentionsProvider } = require('../src');
        const { TestFileAdapter } = require('./_helpers');
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-mention-ignore-'));
        try {
            fs.mkdirSync(path.join(workspace, '.tsdi-agent', 'tool-output'), { recursive: true });
            fs.writeFileSync(path.join(workspace, '.tsdi-agent', 'tool-output', 'call_00_abc.txt'), 'spill\n', 'utf8');
            fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
            const provider = new AgentConsoleWorkspaceMentionsProvider(new TestFileAdapter());
            const values = (await provider.resolveSuggestions(workspace, '@', 12, [])).map((item: any) => item.value);
            expect(values.some((value: string) => value.startsWith('@.tsdi-agent'))).toEqual(false);
            expect(values).toContain('@src/');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}

/** Command descriptions are localized through the describe hook. */
@Suite('localized command descriptions')
export class CommandDescriptionLocaleTest {
    @Test('suggestion descriptions use the provided translator')
    async localizedDescription() {
        const describe = (key: string, fallback: string) => key === 'agent.command.desc.sessions' ? '会话列表' : fallback;
        const options = resolveAgentConsoleInputSuggestions('/sessions', '/sessions'.length, ['/sessions'], [], [], {
            groupLabels: { session: '会话' },
            describe
        });
        expect(options[0].description).toContain('[会话]');
        expect(options[0].description).toContain('会话列表');
    }

    @Test('help options accept the same describe hook')
    async localizedHelp() {
        const { buildAgentConsoleHelpOptions } = require('../src');
        const options = buildAgentConsoleHelpOptions((key: string, fallback: string) => key === 'agent.command.desc.help' ? '查看命令帮助（按分类分组）' : fallback);
        const help = options.find((option: any) => option.value === '/help');
        expect(help.description).toEqual('查看命令帮助（按分类分组）');
    }
}

/** Subcommand rows in /help follow the same describe hook. */
@Suite('localized subcommand descriptions')
export class SubcommandDescriptionLocaleTest {
    @Test('/help localizes subcommand rows')
    async localizedSubcommands() {
        const { buildAgentConsoleHelpOptions } = require('../src');
        const options = buildAgentConsoleHelpOptions((key: string, fallback: string) => key === 'agent.command.sub.diagnostics.trend' ? '轮次诊断趋势' : fallback);
        const trend = options.find((option: any) => option.value === '/diagnostics trend');
        expect(trend.description).toEqual('轮次诊断趋势');
    }
}

/**
 * Real TUI findings (2026-10-23):
 *  - Tab on a directory inserted a trailing space (`@sleep-system/ src`), so the
 *    next path segment could not be attached to the mention;
 *  - a file named `with space.txt` completed to `@with space.txt`, which the
 *    prompt parser read as the mention `@with` (display showed `Files · with`).
 */
@Suite('/ and @ menu completion edge cases')
export class SuggestionCompletionEdgeTest {
    @Test('directory completion keeps the token open instead of adding a space')
    async directoryCompletionKeepsToken() {
        const dir = '@sleep-system/';
        const applied = applyAgentConsoleSuggestion('@sl', '@sl'.length, dir);
        expect(applied.value).toEqual(dir);
        expect(applied.cursor).toEqual(dir.length);

        // Typing the next segment continues the same mention token.
        expect(getAgentConsoleInputTokenRange(`${applied.value}src`, dir.length + 3)?.token).toEqual('@sleep-system/src');
    }

    @Test('paths with spaces are quoted so the mention stays whole')
    async spacedPathIsQuoted() {
        const applied = applyAgentConsoleSuggestion('@with', '@with'.length, '@with space.txt');
        expect(applied.value).toEqual('@"with space.txt" ');
        expect(applied.cursor).toEqual('@"with space.txt" '.length);
        const token = getAgentConsoleInputTokenRange('@"with space.txt"', 17);
        expect(token?.token).toEqual('@"with space.txt"');
    }

    @Test('a directory with spaces is quoted and keeps the token open')
    async spacedDirectoryCompletion() {
        const applied = applyAgentConsoleSuggestion('@my', '@my'.length, '@my dir/');
        expect(applied.value).toEqual('@"my dir/');
        expect(applied.cursor).toEqual('@"my dir/'.length);
        const continued = `${applied.value}src`;
        expect(getAgentConsoleInputTokenRange(continued, continued.length)?.token).toEqual('@"my dir/src');
    }

    @Test('Chinese text right before @ still opens mentions (no space typed)')
    async cjkMentionBoundary() {
        const range = getAgentConsoleInputTokenRange('请总结@bank', '请总结@bank'.length);
        expect(range?.token).toEqual('@bank');
        expect(range?.start).toEqual(3);

        const options = resolveAgentConsoleInputSuggestions('请总结@ban', '请总结@ban'.length, [], [], [
            { label: '@bank-system/', value: '@bank-system/', description: 'folder' }
        ]);
        expect(options.map(option => option.value)).toContain('@bank-system/');

        // ASCII neighbours must stay excluded (emails / handles).
        expect(getAgentConsoleInputTokenRange('test@example.com', 'test@example.com'.length)).toBeUndefined();
        expect(getAgentConsoleInputTokenRange('Hello@World', 'Hello@World'.length)).toBeUndefined();
        // A CJK-prefixed slash word is still not a command (line-start only).
        expect(getAgentConsoleInputTokenRange('请/foo', '请/foo'.length)).toBeUndefined();
    }

    @Test('the mention parser shares the CJK boundary')
    async cjkMentionParser() {
        expect(parseAgentConsoleMentionNames('请总结@bank-system 与 @workspace')).toEqual(['bank-system', 'workspace']);
        expect(parseAgentConsoleMentionNames('联系 test@example.com')).toEqual([]);
        expect(parseAgentConsoleMentionNames('请@')).toEqual([]);
    }

    @Test('arguments complete from subcommands and enum values')
    async argumentCompletion() {
        const range = getAgentConsoleArgumentRange('/delegation l', '/delegation l'.length);
        expect(range).toEqual({ start: '/delegation '.length, end: '/delegation l'.length, token: 'l', command: '/delegation' });
        expect(getAgentConsoleArgumentRange('/layout ', '/layout '.length)).toBeUndefined();
        expect(getAgentConsoleArgumentRange('/layout', '/layout'.length)).toBeUndefined();

        const subcommands = resolveAgentConsoleArgumentCandidates('/delegation', 'l');
        expect(subcommands.map(option => option.value)).toEqual(['lineage']);

        const enumValues = resolveAgentConsoleArgumentCandidates('/layout', 'st');
        expect(enumValues.map(option => option.value)).toEqual(['stream']);
        expect(resolveAgentConsoleArgumentCandidates('/queue', 'c').map(option => option.value)).toEqual(['clear']);
        expect(resolveAgentConsoleArgumentCandidates('/status', 'x')).toEqual([]);
    }

    @Test('/keymap declares its subcommands so they complete too')
    async keymapSubcommands() {
        expect(resolveAgentConsoleArgumentCandidates('/keymap', 'l').map(option => option.value)).toEqual(['list']);
        expect(resolveAgentConsoleArgumentCandidates('/keymap', 're').map(option => option.value)).toEqual(['reset', 'record']);
        const options = resolveAgentConsoleInputSuggestions('/keymap l', '/keymap l'.length, ['/keymap'], [], []);
        expect(options[0].value).toEqual('list');
    }

    @Test('the suggestion resolver feeds the argument menu and Tab replaces the word')
    async argumentMenuAndApply() {
        const options = resolveAgentConsoleInputSuggestions('/layout st', '/layout st'.length, ['/layout'], [], []);
        expect(options.map(option => option.value)).toEqual(['stream']);

        const applied = applyAgentConsoleSuggestion('/layout st', '/layout st'.length, 'stream');
        expect(applied.value).toEqual('/layout stream ');
        expect(applied.cursor).toEqual('/layout stream '.length);

        // Indented commands still complete their arguments.
        const indented = applyAgentConsoleSuggestion('  /layout v', '  /layout v'.length, 'viewport');
        expect(indented.value).toEqual('  /layout viewport ');
    }

    @Test('leading indentation still opens the command menu (submit trims)')
    async leadingSpaceCommand() {
        const range = getAgentConsoleInputTokenRange('  /se', 5);
        expect(range?.token).toEqual('/se');
        expect(range?.start).toEqual(2);
        const options = resolveAgentConsoleInputSuggestions('  /se', 5, ['/session', '/status', '/settings'], [], []);
        expect(options.map(option => option.value)).toContain('/session');

        // A `/`-word inside a message still must not open the palette.
        expect(getAgentConsoleInputTokenRange('check /tmp/foo', 'check /tmp/foo'.length)).toBeUndefined();
    }

    @Test('quoted queries still match suggestions')
    async quotedQueryMatches() {
        const options = resolveAgentConsoleInputSuggestions('@"with sp', '@"with sp'.length, [], [], [
            { label: '@with space.txt', value: '@with space.txt', description: 'file' }
        ]);
        expect(options.map(option => option.value)).toContain('@with space.txt');
    }

    @Test('the prompt parser reads quoted mentions as one name')
    async quotedMentionsParse() {
        expect(parseAgentConsoleMentionNames('see @"my file.txt" and @plain @workspace')).toEqual(['my file.txt', 'plain', 'workspace']);
        // Unterminated quotes are not mentions yet.
        expect(parseAgentConsoleMentionNames('@"my file')).toEqual([]);
    }

    @Test('the prompt enricher resolves the full quoted path')
    async enricherUsesFullName() {
        const names: string[] = [];
        const enriched = await enrichPromptWithMentions({
            state: { workspace: '/w', sessionId: 's', provider: 'p', model: 'm', tools: [] },
            mentionCatalog: [],
            workspaceMentionsProvider: {
                resolveContext: async (_workspace: string, name: string) => {
                    names.push(name);
                    return [`File ${name}`];
                }
            },
            resolveApps: () => []
        } as any, 'read @"my file.txt" please');
        expect(names).toEqual(['my file.txt']);
        expect(enriched).toContain('File my file.txt');
    }

    @Test('the workspace provider strips quotes from the query')
    async providerUnquotes() {
        const provider = new AgentConsoleWorkspaceMentionsProvider(null);
        expect((provider as any).normalizeWorkspaceQuery('@"my dir/')).toEqual('my dir/');
        expect((provider as any).normalizeWorkspaceQuery('@plain/path')).toEqual('plain/path');
    }
}
