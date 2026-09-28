import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runLayoutCommand } from '../src/AgentConsoleSettingsCommands';
import { syncConsoleMessageViewportView } from '../src/AgentConsoleTerminalInputController';
import { AgentConsoleSettingsStore } from '../src/AgentConsoleSettingsStore';
import { defaultAgentConsoleOptions } from '../src/AgentConsoleSessionState';
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
}
