import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext, ApplicationRunners } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import {
    TuiConsoleModule,
    TerminalInputSequenceDecoder,
    ConsoleTerminalInputHandler,
    ConsoleTerminalSurfaceAccessor,
    ConsoleTerminalSurfaceLifecycle,
    ConsoleTerminalApplicationLifecycleService,
    ConsoleTerminalInputController
} from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { ConsoleTerminalSurfaceAccessor as AgentConsoleTerminalSurfaceAccessor } from '../src/console-ports';
import { isAgentConsoleSuggestionMenu } from '../src/AgentConsoleSuggestions';
import { AgentConsoleInputHistoryStore } from '../src/AgentConsoleInputHistoryStore';

/**
 * Real UI-interaction regression tests for the agent TUI input pipeline.
 *
 * These drive the ACTUAL terminal input path end-to-end:
 *   ConsoleTerminalInputController (fake input stream + real sequence decoder)
 *   -> AgentConsoleComponent.handleTerminalInput
 *   -> AgentConsoleSessionState key/menu/history handling
 * and assert on both state mutations and the composed terminal lines via
 * ConsoleTerminalSurfaceAccessor.getLastRenderedLines().
 *
 * Regression coverage:
 *  - ESC must interrupt a running agent turn (also when the keymap has no
 *    escape binding), instead of being silently consumed.
 *  - Left/right must NOT dismiss the `/` suggestion menu and must not leave a
 *    stale placeholder prompt row on screen.
 *  - Up/down must recall input history through the real pipeline, skipping
 *    slash-command entries.
 *  - The workspace-scoped input history store must round-trip its entries.
 */
@Suite('UI input interaction regression: escape interrupt, suggestion menu, input history')
export class UiInputInteractionRegressionTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        // mirror runAgentUi wiring: handler + surface lifecycle resolve to the bootstrap component instance
        this.ctx = await Application.run({
            module: {
                imports: [AgentModule, AgentUiModule, TuiConsoleModule, ComponentsModule],
                providers: [
                    {
                        provide: AgentConsoleTerminalSurfaceAccessor,
                        deps: [ConsoleTerminalSurfaceAccessor],
                        useFactory: (surface: ConsoleTerminalSurfaceAccessor) => surface
                    },
                    {
                        provide: ConsoleTerminalInputHandler,
                        deps: [ApplicationRunners],
                        useFactory: (runners: ApplicationRunners) => runners.getRef(AgentConsoleComponent)?.instance
                    },
                    {
                        provide: ConsoleTerminalSurfaceLifecycle,
                        deps: [ApplicationRunners],
                        useFactory: (runners: ApplicationRunners) => runners.getRef(AgentConsoleComponent)?.instance
                    }
                ],
                bootstrap: [AgentConsoleComponent, ConsoleTerminalApplicationLifecycleService]
            }
        });
    }

    @After()
    async clean() {
        await this.ctx?.close();
        if (global.gc) global.gc();
    }

    protected async settle(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 50));
        await Promise.resolve();
        await Promise.resolve();
    }

    protected console(): AgentConsoleComponent {
        const ref = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent);
        expect(ref).toBeDefined();
        return ref!.instance;
    }

    /** Drives real raw-mode stdin chunks through the TerminalInputSequenceDecoder. */
    protected async press(...chunks: string[]): Promise<void> {
        const instance = this.console();
        let dataHandler: ((chunk: string) => void) | undefined;
        const controller = new ConsoleTerminalInputController({
            input: {
                on: (_event: string, handler: (chunk: string) => void) => { dataHandler = handler; },
                off: () => undefined,
                read: () => null,
                setRawMode: () => undefined,
                resume: () => undefined,
                pause: () => undefined
            },
            onChunk: (decoded, chunk) => instance.handleTerminalInput(decoded, chunk)
        });
        controller.start();
        try {
            for (const chunk of chunks) {
                dataHandler!(chunk);
                await new Promise(resolve => setTimeout(resolve, 30));
            }
            await this.settle();
        } finally {
            controller.stop();
        }
    }

    protected renderedScreen(): string {
        return this.ctx.get(ConsoleTerminalSurfaceAccessor)!.getLastRenderedLines().join('\n');
    }

    // ------------------------------------------------------------------
    // ESC interrupt
    // ------------------------------------------------------------------

    @Test('Esc while the agent is running cancels the current turn through the real input pipeline')
    async escapeRunningCancelsTurnThroughPipeline() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInput('hello', 5);
        state.setStatus('running');
        const cancelCalls: string[] = [];
        (instance as any).sessionService = {
            cancelTurn: async (sessionId: string) => {
                cancelCalls.push(sessionId);
                return true;
            }
        };

        // real stdin: bare Escape is ambiguous until the 25ms flush timer fires
        await this.press('\u001b');

        expect(cancelCalls).toEqual([state.sessionId]);
        expect(state.status).toBe('running');
    }

    @Test('Esc cancels a running turn even when the keymap has no escape binding (custom keymap / persisted keymap)')
    async escapeRunningCancelsTurnWithoutKeymapBinding() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInput('draft', 5);
        state.setStatus('running');
        const cancelCalls: string[] = [];
        (instance as any).sessionService = {
            cancelTurn: async (sessionId: string) => {
                cancelCalls.push(sessionId);
                return true;
            }
        };
        // strip the escape binding from every keymap context (emulates a
        // custom/persisted keymap where escape is disabled)
        (instance as any).globalKeymap.configure({ escape: null });
        try {
            await this.press('\u001b');
        } finally {
            (instance as any).globalKeymap.reset();
        }

        // ESC must still interrupt the running turn instead of being swallowed
        expect(cancelCalls).toEqual([state.sessionId]);
    }

    @Test('Ctrl+C and Esc reach cancellation while the submitted turn is still pending')
    async interruptKeysCancelPendingSubmittedTurn() {
        const instance = this.console();
        const state = instance.sessionState;
        const cancelCalls: string[] = [];
        (instance as any).sessionService = {
            cancelTurn: async (sessionId: string) => {
                cancelCalls.push(sessionId);
                return true;
            }
        };

        for (const interrupt of ['\u0003', '\u001b']) {
            state.setInput('run a long task', 15);
            let releaseTurn!: () => void;
            const pendingTurn = new Promise<void>(resolve => { releaseTurn = resolve; });
            (instance as any).submit = async () => {
                state.setStatus('running');
                await pendingTurn;
                state.setStatus('idle');
            };
            try {
                await this.press('\r', interrupt);
            } finally {
                releaseTurn();
                await pendingTurn;
            }
        }
        expect(cancelCalls).toEqual([state.sessionId, state.sessionId]);
    }

    @Test('Esc while idle dismisses focus surfaces and does not cancel anything')
    async escapeIdleDoesNotCancel() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInput('draft', 5);
        state.setStatus('idle');
        const cancelCalls: string[] = [];
        (instance as any).sessionService = {
            cancelTurn: async (sessionId: string) => {
                cancelCalls.push(sessionId);
                return true;
            }
        };
        await this.press('\u001b');
        expect(cancelCalls).toEqual([]);
        expect(state.input).toBe('draft');
    }

    // ------------------------------------------------------------------
    // Left/right with the `/` suggestion menu open
    // ------------------------------------------------------------------

    @Test('left/right keeps the / suggestion menu open and moves the input cursor')
    async leftRightKeepsSuggestionMenuOpen() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInput('', 0);

        // type '/' through the real pipeline -> command suggestion menu opens
        await this.press('/');
        expect(state.input).toBe('/');
        expect(state.selectMenu).toBeTruthy();
        expect(isAgentConsoleSuggestionMenu(state.selectMenu!)).toBe(true);
        const menuTitleBefore = state.selectMenu?.title;

        // cursor to end of '/', then press LEFT
        state.setInputCursor(1);
        await this.press('\u001b[D');

        // menu must STILL be open, cursor must have moved
        expect(state.selectMenu).toBeTruthy();
        expect(isAgentConsoleSuggestionMenu(state.selectMenu!)).toBe(true);
        expect(state.selectMenu?.title).toBe(menuTitleBefore);
        expect((state as any).suppressSuggestionMenu).toBeFalsy();
        expect(state.input).toBe('/');
        expect(state.inputCursor).toBe(0);

        // pressing RIGHT moves the cursor back without closing the menu
        await this.press('\u001b[C');
        expect(state.selectMenu).toBeTruthy();
        expect(state.inputCursor).toBe(1);
    }

    @Test('no stale placeholder prompt row remains after typing / and pressing left/right')
    async leftRightLeavesSingleComposerPromptLine() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInput('', 0);
        await this.settle();

        // composer placeholder row is rendered while the input is empty
        const before = this.renderedScreen();
        expect(before).toContain('Ask code or files');

        // type '/' and press LEFT (menu opens, cursor moves, stay open)
        await this.press('/', '\u001b[D');
        await this.settle();

        const after = this.renderedScreen();
        // the stale placeholder must be gone: no 'Ask code or files' anywhere
        expect(after).not.toContain('Ask code or files');
        // exactly one visible composer prompt row starts with '> '
        const promptRows = after.split('\n')
            .map(line => line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ''))
            .filter(line => line.trim().startsWith('> '));
        expect(promptRows.length).toBe(1);
        expect(promptRows[0]).toContain('/');
    }

    // ------------------------------------------------------------------
    // Up/down input history
    // ------------------------------------------------------------------

    @Test('up/down recalls input history through the real input pipeline')
    async upDownRecallsHistory() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInputHistoryEntries(['fix the tests', 'add logging']);
        state.setInput('', 0);

        // ArrowUp -> most recent entry
        await this.press('\u001b[A');
        expect(state.input).toBe('fix the tests');
        expect(state.inputCursor).toBe('fix the tests'.length);

        // ArrowUp again -> older entry
        await this.press('\u001b[A');
        expect(state.input).toBe('add logging');

        // ArrowDown -> back to the newer entry
        await this.press('\u001b[B');
        expect(state.input).toBe('fix the tests');

        // ArrowDown again -> back to the original draft (empty)
        await this.press('\u001b[B');
        expect(state.input).toBe('');
    }

    @Test('recalled input keeps history navigation ahead of a newly opened suggestion menu')
    async tuiSuggestionMenuWinsAfterHistoryRecall() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInputHistoryEntries(['recent prompt', 'older prompt']);
        state.setInput('draft', 5);

        await this.press('\u001b[A');
        expect(state.input).toBe('recent prompt');
        state.selectMenu = {
            title: 'Suggestions',
            options: [
                { value: '@src/index.ts', label: 'src/index.ts' },
                { value: '@src/app.ts', label: 'src/app.ts' }
            ],
            selectedIndex: 0
        } as any;

        // History browsing has already started: ArrowDown stays on history
        // (returning to the original draft) instead of being stolen by the
        // newly opened suggestion menu (selectedIndex would move to 1 if the
        // menu had consumed the arrow). The menu itself is token-derived:
        // returning to a draft without an '@' token closes it.
        await this.press('\u001b[B');
        expect(state.input).toBe('draft');
        expect(state.selectMenu).toBeUndefined();
    }

    @Test('TUI suggestion menu handles arrows before input history')
    async tuiSuggestionMenuWinsOnFirstArrow() {
        const state = this.console().sessionState;
        state.setInputHistoryEntries(['recent prompt', 'older prompt']);
        state.setInput('draft', 5);
        state.selectMenu = {
            title: 'Suggestions',
            options: [
                { value: '@src/index.ts', label: 'src/index.ts' },
                { value: '@src/app.ts', label: 'src/app.ts' }
            ],
            selectedIndex: 0
        } as any;

        await this.press('\u001b[B');
        expect(state.input).toBe('draft');
        expect(state.selectMenu?.selectedIndex).toBe(1);
    }

    @Test('history navigation skips slash-command entries')
    async historySkipsSlashCommands() {
        const instance = this.console();
        const state = instance.sessionState;
        state.setInputHistoryEntries(['/help', 'real prompt', '/status']);
        state.setInput('', 0);

        expect(state.navigateInputHistory(-1)).toBe(true);
        expect(state.input).toBe('real prompt');
        expect(state.navigateInputHistory(-1)).toBe(false); // nothing older (commands skipped)
    }

    @Test('ArrowUp/ArrowDown recall only non-command entries through the real input pipeline')
    async arrowKeysRecallOnlyNonCommandsThroughPipeline() {
        const instance = this.console();
        const state = instance.sessionState;
        // Entries are stored newest-first (index 0), matching pushInputHistory.
        state.setInputHistoryEntries(['add logging', 'fix the tests', '/status', '/help']);
        state.setInput('', 0);

        // ArrowUp -> newest real entry ('/help' newest of them all is skipped)
        await this.press('\u001b[A');
        expect(state.input).toBe('add logging');

        // ArrowUp -> next real entry ('/status' skipped as well)
        await this.press('\u001b[A');
        expect(state.input).toBe('fix the tests');

        // ArrowDown -> back down through the history, still skipping commands
        await this.press('\u001b[B');
        expect(state.input).toBe('add logging');

        // ArrowDown -> back to the original empty draft (never a command)
        await this.press('\u001b[B');
        expect(state.input).toBe('');
    }

    @Test('submitting slash commands and prompts recalls only prompts through the real pipeline')
    async submitThenRecallSkipsCommandsThroughPipeline() {
        const instance = this.console();
        const state = instance.sessionState;
        const submitted: string[] = [];
        (instance as any).submit = async () => {
            const value = state.input.trim();
            if (!value) return;
            state.pushInputHistory(value);
            state.setInput('', 0);
            submitted.push(value);
        };

        // type '/help' and submit it (a command)
        await this.press('/help\r');
        expect(submitted).toEqual(['/help']);

        // type a real prompt and submit it
        await this.press('fix the tests\r');
        expect(submitted).toEqual(['/help', 'fix the tests']);

        // ArrowUp must recall the real prompt, NOT the command submitted earlier
        await this.press('\u001b[A');
        expect(state.input).toBe('fix the tests');

        // ArrowDown restores the empty draft
        await this.press('\u001b[B');
        expect(state.input).toBe('');
    }

    // ------------------------------------------------------------------
    // Workspace-scoped history store contract
    // ------------------------------------------------------------------

    @Test('input history store round-trips entries scoped to workspace + session')
    async inputHistoryStoreRoundTrip() {
        const records: any[] = [];
        const memory = {
            async getAll(_scope?: string) { return records; },
            async get(id: string) { return records.find(record => record.id === id) ?? null; },
            async put(record: any) {
                const index = records.findIndex(item => item.id === record.id);
                if (index >= 0) {
                    records[index] = record;
                } else {
                    records.push(record);
                }
            },
            async delete(id: string) {
                const index = records.findIndex(item => item.id === id);
                if (index >= 0) {
                    records.splice(index, 1);
                }
            }
        };
        const store = new AgentConsoleInputHistoryStore(undefined as any, memory as any);

        await store.save(['first prompt', 'second prompt'], '/work/demo', 'console');
        const loaded = await store.load('/work/demo', 'console');

        expect(loaded).toEqual(['first prompt', 'second prompt']);

        // workspace isolation: another workspace must not see the entries
        const other = await store.load('/work/other', 'console');
        expect(other).toEqual([]);
    }
}
