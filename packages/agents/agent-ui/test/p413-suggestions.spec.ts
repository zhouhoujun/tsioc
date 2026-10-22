import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { getAgentConsoleMentionCandidates, rankAgentConsoleCommandMatches, resolveAgentConsoleInputSuggestions } from '../src/AgentConsoleSuggestions';

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
