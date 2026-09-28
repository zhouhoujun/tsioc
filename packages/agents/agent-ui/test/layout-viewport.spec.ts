import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runLayoutCommand } from '../src/AgentConsoleSettingsCommands';
import { syncConsoleMessageViewportView, handleTerminalInputView } from '../src/AgentConsoleTerminalInputController';
import { resolveTranscriptLayout } from '../src/AgentConsoleTranscriptLayout';
import { scrollTranscript } from '../src/AgentConsoleTranscriptNavigation';
import { AgentConsoleSettingsStore } from '../src/AgentConsoleSettingsStore';
import { defaultAgentConsoleOptions } from '../src/AgentConsoleSessionState';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';
import { TestFileAdapter } from './_helpers';

function layoutState(initial: 'stream' | 'viewport' = 'viewport') {
    let current = initial;
    return {
        get current() { return current; },
        state: {
            messageLayout: initial,
            setMessageLayout(value: 'stream' | 'viewport') {
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

    @Test('/layout toggles between viewport and stream and persists the choice')
    async layoutTogglesAndPersists() {
        const harness = layoutState('viewport');
        const notices: string[] = [];
        const patches: Array<Record<string, any>> = [];

        await runLayoutCommand(undefined, harness.state as any, message => notices.push(message), async patch => { patches.push(patch); });
        expect(harness.current).toEqual('stream');
        expect(patches[patches.length - 1]).toEqual({ messageLayout: 'stream' });

        await runLayoutCommand(undefined, harness.state as any, message => notices.push(message), async patch => { patches.push(patch); });
        expect(harness.current).toEqual('viewport');
        expect(patches[patches.length - 1]).toEqual({ messageLayout: 'viewport' });
        expect(notices[notices.length - 1]).toContain('windowed');
    }

    @Test('/layout accepts explicit values and legacy dynamic alias')
    async layoutAcceptsExplicitValues() {
        const harness = layoutState('viewport');
        const run = (arg: string) => runLayoutCommand(arg, harness.state as any, () => {}, async () => {});
        await run('stream');
        expect(harness.current).toEqual('stream');
        await run('dynamic');
        expect(harness.current).toEqual('viewport');
        await run('windowed');
        expect(harness.current).toEqual('viewport');
    }

    @Test('/layout rejects unknown modes with usage text')
    async layoutRejectsUnknownMode() {
        const harness = layoutState('viewport');
        const notices: string[] = [];
        await runLayoutCommand('bogus', harness.state as any, message => notices.push(message), async () => {});
        expect(harness.current).toEqual('viewport');
        expect(notices[notices.length - 1]).toContain('Usage: /layout');
    }

    @Test('viewport mode sizes the transcript window from terminal rows')
    syncsViewportFromTerminalRows() {
        const host: any = {
            state: {
                consoleOptions: { messageLayout: 'viewport' },
                messagesViewportItems: 0,
                setMessagesViewportItems(value: number) { this.messagesViewportItems = value; }
            },
            surfaceAccessor: { getTerminalSize: () => ({ rows: 30 }) }
        };
        syncConsoleMessageViewportView(host);
        expect(host.state.messagesViewportItems).toEqual(24);

        host.state.consoleOptions.messageLayout = 'stream';
        host.state.messagesViewportItems = 0;
        syncConsoleMessageViewportView(host);
        expect(host.state.messagesViewportItems).toEqual(0);
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
            expect((await store.load(workspace)).messageLayout).toEqual('stream');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('transcript layout strategy selects native scrollback and wheel handling')
    layoutStrategy() {
        expect(resolveTranscriptLayout('stream').usesNativeScrollback).toEqual(true);
        expect(resolveTranscriptLayout('stream').wheelScrollsHistory).toEqual(false);
        expect(resolveTranscriptLayout('viewport').usesNativeScrollback).toEqual(false);
        expect(resolveTranscriptLayout('viewport').wheelScrollsHistory).toEqual(true);
        expect(resolveTranscriptLayout('dynamic').usesNativeScrollback).toEqual(false);
    }

    @Test('viewport scroll walks history and resumes follow at the tail')
    viewportScrollsHistoryAndResumesFollow() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'viewport', messagesVisibleItems: 5 });
        state.setMessages(fiveMessages());

        expect(state.messagesFocused).toEqual(false);
        scrollTranscript(state, -1);
        expect(state.messagesFocused).toEqual(true);
        expect(state.selectedMessageId).toEqual('m4');
        scrollTranscript(state, -1);
        expect(state.selectedMessageId).toEqual('m3');
        scrollTranscript(state, 1);
        scrollTranscript(state, 1);
        expect(state.messagesFocused).toEqual(false);
    }

    @Test('stream layout ignores transcript scroll')
    streamScrollIsNoop() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'stream' });
        state.setMessages(fiveMessages());
        expect(resolveTranscriptLayout('stream').scroll(-1, state)).toEqual(false);
        expect(state.messagesFocused).toEqual(false);
        expect(state.selectedMessageId).not.toEqual('m4');
    }

    @Test('new messages while scrolled increment the new count and reset on follow')
    newCountTracksWhileScrolled() {
        const state = new AgentConsoleSessionState();
        state.setConsoleOptions({ messageLayout: 'viewport' });
        state.setMessages(fiveMessages());
        scrollTranscript(state, -1);
        expect(state.messagesNewCount).toEqual(0);
        state.appendMessage({ id: 'm6', role: 'assistant', content: 'six', createdAt: 6 } as any);
        state.appendMessage({ id: 'm7', role: 'assistant', content: 'seven', createdAt: 7 } as any);
        expect(state.messagesNewCount).toEqual(2);
        state.setMessagesFocused(false);
        expect(state.messagesNewCount).toEqual(0);
    }

    @Test('viewport routes terminal wheel to transcript history')
    async viewportRoutesWheelToHistory() {
        const scrolled: number[] = [];
        const dispatched: unknown[] = [];
        const state: any = {
            consoleOptions: { messageLayout: 'viewport', messageToggleInteraction: 'enter' },
            messageDetailVisibleLines: 6,
            messagesViewportItems: 0,
            setMessagesViewportItems() {},
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
}

function fiveMessages() {
    return Array.from({ length: 5 }, (_, index) => ({
        id: `m${index + 1}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message ${index + 1}`,
        createdAt: index + 1
    })) as any;
}
