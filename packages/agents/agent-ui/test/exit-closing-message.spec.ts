import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { requestTerminalExitView } from '../src/AgentConsoleTerminalInputController';

@Suite('console exit closing message')
export class ConsoleExitClosingMessageTest {
    @Test('writes the closing message after the app closes so cleanup cannot erase it')
    async writesAfterClose() {
        const events: string[] = [];
        const written: string[] = [];
        const host: any = {
            closing: false,
            app: { close: async () => { events.push('close'); } },
            notify: (message: string) => { events.push(`notify:${message}`); },
            surfaceAccessor: {
                stopTerminal: () => { events.push('stop'); },
                writeRawTerminalData: (data: string) => { events.push('write'); written.push(data); }
            }
        };

        await requestTerminalExitView(host, 'Closing session. Resume with: tsdi-agent chat --session s1');

        expect(events).toEqual(['stop', 'close', 'write']);
        expect(written[0]).toContain('s1');
    }

    @Test('is idempotent while already closing')
    async idempotent() {
        const events: string[] = [];
        const host: any = {
            closing: true,
            app: { close: async () => { events.push('close'); } },
            surfaceAccessor: {}
        };
        await requestTerminalExitView(host, 'x');
        expect(events).toEqual([]);
    }

    @Test('notifies when there is no app to close')
    async notifyWithoutApp() {
        const events: string[] = [];
        const host: any = {
            closing: false,
            app: null,
            notify: (message: string) => { events.push(`notify:${message}`); },
            surfaceAccessor: { stopTerminal: () => { events.push('stop'); } }
        };
        await requestTerminalExitView(host, 'bye s1');
        expect(events).toEqual(['notify:bye s1', 'stop']);
    }
}
