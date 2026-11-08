import { navigationFor } from './test-transcript-navigation';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { applyPersistedLayout, mapTuiLayoutArg, runLayoutCommand } from '../src/AgentConsoleSettingsCommands';
import { handleTerminalInputView, syncConsoleMessageDetailViewportView, syncMarkdownWidthFromSurface } from '../src/AgentConsoleTerminalInputController';
import { resolveTranscriptLayout } from '../src/AgentConsoleTranscriptLayout';
import { AgentConsoleSettingsStore } from '../src/AgentConsoleSettingsStore';
import { normalizeMessageLayout } from '../src/AgentConsoleViewport';
import { defaultAgentConsoleOptions } from '../src/AgentConsoleSessionState';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { TestFileAdapter } from './_helpers';

function layoutState(initial: 'scrollback' | 'viewport' = 'viewport') {
    let current = initial;
    return {
        get current() { return current; },
        state: {
            messageLayout: initial,
            setMessageLayout(value: 'scrollback' | 'viewport') {
                current = value;
                (this as any).messageLayout = value;
            }
        }
    };
}

@Suite('Agent console viewport layout')
export class AgentConsoleViewportLayoutTest {
    @Test('viewport is the default transcript layout')
    defaultIsViewport() {
        expect(defaultAgentConsoleOptions.messageLayout).toEqual('viewport');
    }

    @Test('/layout toggles between viewport and scrollback and persists the choice')
    async layoutTogglesAndPersists() {
        const harness = layoutState('viewport');
        const notices: string[] = [];
        const patches: Array<Record<string, any>> = [];

        await runLayoutCommand(undefined, harness.state as any, message => notices.push(message), async patch => { patches.push(patch); });
        expect(harness.current).toEqual('scrollback');
        expect(patches[patches.length - 1]).toEqual({ messageLayout: 'scrollback' });

        await runLayoutCommand(undefined, harness.state as any, message => notices.push(message), async patch => { patches.push(patch); });
        expect(harness.current).toEqual('viewport');
        expect(patches[patches.length - 1]).toEqual({ messageLayout: 'viewport' });
        expect(notices[notices.length - 1]).toContain('fullscreen');
    }

    @Test('/layout accepts explicit values and the legacy dynamic alias')
    async layoutAcceptsExplicitValues() {
        const harness = layoutState('viewport');
        const run = (arg: string) => runLayoutCommand(arg, harness.state as any, () => {}, async () => {});
        await run('scrollback');
        expect(harness.current).toEqual('scrollback');
        await run('dynamic');
        expect(harness.current).toEqual('viewport');
        await run('windowed');
        expect(harness.current).toEqual('viewport');
    }

    @Test('restored settings apply the persisted layout and restart the surface once')
    async restoreAppliesPersistedLayout() {
        const harness = layoutState('viewport');
        let restarts = 0;
        applyPersistedLayout(harness.state as any, { messageLayout: 'scrollback' }, () => { restarts += 1; });
        expect(harness.current).toEqual('scrollback');
        expect(restarts).toEqual(1);

        // Same mode again (e.g. the default) must not tear the surface down.
        applyPersistedLayout(harness.state as any, { messageLayout: 'viewport' }, () => { restarts += 1; });
        applyPersistedLayout(harness.state as any, { messageLayout: 'viewport' }, () => { restarts += 1; });
        expect(harness.current).toEqual('viewport');
        expect(restarts).toEqual(2);

        // Legacy persisted value keeps restoring as scrollback.
        applyPersistedLayout(harness.state as any, { messageLayout: 'stream' }, () => { restarts += 1; });
        expect(harness.current).toEqual('scrollback');
        expect(restarts).toEqual(3);

        // No persisted value leaves the current mode alone.
        applyPersistedLayout(harness.state as any, {}, () => { restarts += 1; });
        expect(harness.current).toEqual('scrollback');
        expect(restarts).toEqual(3);
    }

    @Test('/tui switches fullscreen and scrollback and restarts the surface only on change')
    async tuiSwitchesBuffersAndRestartsSurface() {
        expect(mapTuiLayoutArg('fullscreen')).toEqual('viewport');
        expect(mapTuiLayoutArg('scrollback')).toEqual('scrollback');

        const harness = layoutState('viewport');
        let restarts = 0;
        const run = (arg: string) => runLayoutCommand(
            mapTuiLayoutArg(arg), harness.state as any, () => {}, async () => {}, null, () => { restarts += 1; }
        );
        await run('scrollback');
        expect(harness.current).toEqual('scrollback');
        expect(restarts).toEqual(1);

        // Repeating the current mode must not tear the terminal surface down.
        await run('scrollback');
        expect(restarts).toEqual(1);

        await run('fullscreen');
        expect(harness.current).toEqual('viewport');
        expect(restarts).toEqual(2);
    }

    @Test('/layout rejects unknown modes with usage text')
    async layoutRejectsUnknownMode() {
        const harness = layoutState('viewport');
        const notices: string[] = [];
        await runLayoutCommand('bogus', harness.state as any, message => notices.push(message), async () => {});
        expect(harness.current).toEqual('viewport');
        expect(notices[notices.length - 1]).toContain('Usage: /layout');
    }

    @Test('settings store round-trips viewport and normalizes legacy dynamic')
    async storeNormalizesLegacyDynamic() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-layout-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { messageLayout: 'viewport' });
            const file = path.join(workspace, '.tsdi-agent', 'settings.json');
            const written = JSON.parse(fs.readFileSync(file, 'utf8'));
            expect(written.messageLayout).toEqual('viewport');

            fs.writeFileSync(file, JSON.stringify({ ...written, messageLayout: 'dynamic' }));
            expect((await store.load(workspace)).messageLayout).toEqual('viewport');

            fs.writeFileSync(file, JSON.stringify({ ...written, messageLayout: 'stream' }));
            expect((await store.load(workspace)).messageLayout).toEqual('scrollback');

            await store.save(workspace, { messageLayout: 'scrollback' });
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).messageLayout).toEqual('scrollback');
            expect((await store.load(workspace)).messageLayout).toEqual('scrollback');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('transcript layout strategy selects native scrollback and wheel handling')
    layoutStrategy() {
        expect(resolveTranscriptLayout('scrollback').usesNativeScrollback).toEqual(true);
        expect(resolveTranscriptLayout('scrollback').wheelScrollsHistory).toEqual(false);
        expect(resolveTranscriptLayout('viewport').usesNativeScrollback).toEqual(false);
        expect(resolveTranscriptLayout('viewport').wheelScrollsHistory).toEqual(true);
        expect(resolveTranscriptLayout('dynamic').usesNativeScrollback).toEqual(false);
        // Persisted settings from older builds still resolve to the renamed mode.
        expect(resolveTranscriptLayout('stream').mode).toEqual('scrollback');
        expect(normalizeMessageLayout('stream')).toEqual('scrollback');
        const legacy = new AgentConsoleSessionState();
        legacy.setConsoleOptions({ messageLayout: 'stream' });
        expect(legacy.messageLayout).toEqual('scrollback');
    }

    @Test('terminal surface width feeds markdown before the first resumed render')
    surfaceWidthSyncsMarkdownBeforeRender() {
        const state = { markdownContentWidth: 0 };
        syncMarkdownWidthFromSurface(state, { getTerminalSize: () => ({ columns: 72, rows: 24 }) });
        expect(state.markdownContentWidth).toEqual(70);
    }

    @Test('viewport scroll walks history and resumes follow at the tail')
    viewportScrollsHistoryAndResumesFollow() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'viewport', messagesVisibleItems: 5 });
        state.setMessages(fiveMessages());

        expect(state.messagesFocused).toEqual(false);
        navigationFor(state).scroll(-1);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessageId).toEqual('m4');
        navigationFor(state).scroll(-1);
        expect(state.selectedMessageId).toEqual('m3');
        navigationFor(state).scroll(1);
        navigationFor(state).scroll(1);
        expect(state.messagesFocused).toEqual(false);
    }

    @Test('PageUp reaches the transcript scroll through the decoded-input path')
    async pageUpScrollsViewportThroughDecodedInput() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'viewport' });
        state.setMessages(fiveMessages());
        const nav = navigationFor(state);

        const result = await state.processDecodedInput(
            { text: '', controlKey: 'pageup', partial: false },
            '',
            {
                isClosed: false,
                onExit: () => undefined,
                hasActiveTextPrompt: false,
                transcriptNavigationController: nav
            }
        );

        expect(result.handled).toEqual(true);
        expect(result.action).toEqual('transcriptScroll');
        expect(state.messagesFocused).toEqual(true);
    }

    @Test('PageUp scrolls toward older rows and PageDown toward newer rows')
    async pageKeysScrollInTheRightDirection() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'viewport' });
        state.setMessages(fiveMessages());
        const rows: number[] = [];
        state.scrollTranscriptAction = (value: number) => { rows.push(value); return true; };
        const nav = navigationFor(state);
        const options = {
            isClosed: false,
            onExit: () => undefined,
            hasActiveTextPrompt: false,
            transcriptNavigationController: nav
        };
        await state.processDecodedInput({ text: '', controlKey: 'pageup', partial: false }, '', options);
        await state.processDecodedInput({ text: '', controlKey: 'pagedown', partial: false }, '', options);
        expect(rows).toEqual([10, -10]);
    }

    @Test('scrollback layout ignores transcript scroll')
    scrollbackScrollIsNoop() {        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'scrollback' });
        state.setMessages(fiveMessages());
        expect(resolveTranscriptLayout('scrollback').scroll(-1, navigationFor(state))).toEqual(false);
        expect(state.messagesFocused).toEqual(false);
        expect(state.selectedMessageId).not.toEqual('m4');
    }

    @Test('new messages while scrolled increment the new count and reset on follow')
    newCountTracksWhileScrolled() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'viewport' });
        state.setMessages(fiveMessages());
        navigationFor(state).scroll(-1);
        expect(state.messagesNewCount).toEqual(0);
        state.appendMessage({ id: 'm6', role: 'assistant', content: 'six', createdAt: 6 } as any);
        state.appendMessage({ id: 'm7', role: 'assistant', content: 'seven', createdAt: 7 } as any);
        expect(state.messagesNewCount).toEqual(2);
        navigationFor(state).setFocused(false);
        expect(state.messagesNewCount).toEqual(0);
    }

    @Test('viewport routes terminal wheel to transcript history')
    async viewportRoutesWheelToHistory() {
        const scrolled: number[] = [];
        const dispatched: unknown[] = [];
        const state: any = {
            consoleOptions: { messageLayout: 'viewport', messageToggleInteraction: 'enter' },
            messageDetailVisibleLines: 6,
            setMessageDetailVisibleLines() {}
        };
        const host: any = {
            state,
            closing: false,
            destroyed: false,
            commandPaletteQuery: '',
            sshShell: null,
            surfaceAccessor: {
                getTerminalSize: () => ({ rows: 30 }),
                dispatchMouse: (mouse: unknown) => { dispatched.push(mouse); }
            },
            scrollMessages: (delta: number) => { scrolled.push(delta); },
            translator: null
        };
        await handleTerminalInputView(host, { text: '', mouse: { button: 64 } } as any, '' as any);
        await handleTerminalInputView(host, { text: '', mouse: { button: 65 } } as any, '' as any);
        expect(scrolled).toEqual([-1, 1]);
        expect(dispatched.length).toEqual(0);
    }

    @Test('detail viewport prefers measured surface rows over the chrome estimate')
    detailViewportPrefersMeasuredRows() {
        let measuredRows = 25;
        const state: any = { consoleOptions: { messageToggleInteraction: 'enter' }, messageDetailVisibleLines: 6, setMessageDetailVisibleLines(value: number) { this.messageDetailVisibleLines = value; } };
        const host: any = {
            state,
            destroyed: false,
            surfaceAccessor: {
                getTerminalSize: () => ({ rows: 30 }),
                getTerminalViewportRows: () => measuredRows
            }
        };
        syncConsoleMessageDetailViewportView(host);
        expect(state.messageDetailVisibleLines).toEqual(25);
        measuredRows = 60;
        syncConsoleMessageDetailViewportView(host);
        expect(state.messageDetailVisibleLines).toEqual(40);
        measuredRows = 3;
        syncConsoleMessageDetailViewportView(host);
        expect(state.messageDetailVisibleLines).toEqual(8);
    }

    @Test('detail viewport falls back to the size-based chrome estimate')
    detailViewportFallsBackToEstimate() {
        const state: any = { consoleOptions: { messageToggleInteraction: 'enter' }, messageDetailVisibleLines: 6, setMessageDetailVisibleLines(value: number) { this.messageDetailVisibleLines = value; } };
        const host: any = {
            state,
            destroyed: false,
            surfaceAccessor: { getTerminalSize: () => ({ rows: 30 }) }
        };
        syncConsoleMessageDetailViewportView(host);
        expect(state.messageDetailVisibleLines).toEqual(24);
    }

    @Test('terminal resize recomputes the detail viewport without a keypress')
    detailViewportRecomputesOnResize() {
        let viewportRows = 20;
        let resizeListener: (() => void) | undefined;
        const state: any = { consoleOptions: { messageToggleInteraction: 'enter' }, messageDetailVisibleLines: 6, setMessageDetailVisibleLines(value: number) { this.messageDetailVisibleLines = value; } };
        const host: any = {
            state,
            destroyed: false,
            surfaceAccessor: {
                getTerminalSize: () => ({ rows: 30 }),
                getTerminalViewportRows: () => viewportRows,
                subscribeToSurfaceResize: (listener: () => void) => {
                    resizeListener = listener;
                    return () => { resizeListener = undefined; };
                }
            }
        };
        syncConsoleMessageDetailViewportView(host);
        expect(state.messageDetailVisibleLines).toEqual(20);
        viewportRows = 14;
        resizeListener!();
        expect(state.messageDetailVisibleLines).toEqual(14);
    }
}

function fiveMessages() {
    return Array.from({ length: 5 }, (_, index) => ({
        id: `m${index + 1}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message ${index + 1}`,
        createdAt: index + 1
    })) as any;
}
