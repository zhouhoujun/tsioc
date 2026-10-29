import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { scrollAgentConsoleTranscript } from '../src/AgentConsoleTranscriptLayout';

@Suite('transcript wheel scroll')
export class TranscriptWheelScrollTest {
    @Test('a viewport that cannot scroll does not focus or select messages')
    async noFallbackToMessageFocus() {
        const navigationCalls: number[] = [];
        const navigation: any = {
            scroll: (delta: number) => { navigationCalls.push(delta); return true; }
        };
        let synced = 0;
        scrollAgentConsoleTranscript(
            { scrollViewport: () => false },
            navigation,
            () => { synced += 1; },
            -1
        );
        expect(navigationCalls).toEqual([]);
        expect(synced).toEqual(1);
    }

    @Test('a viewport that scrolls consumes the wheel without selecting a message')
    async viewportConsumesWheel() {
        const rows: number[] = [];
        const navigationCalls: number[] = [];
        const navigation: any = {
            scroll: (delta: number) => { navigationCalls.push(delta); return true; }
        };
        scrollAgentConsoleTranscript(
            { scrollViewport: (value: number) => { rows.push(value); return true; } },
            navigation,
            () => undefined,
            1
        );
        expect(rows).toEqual([-3]);
        expect(navigationCalls).toEqual([]);
    }

    @Test('hosts without a viewport keep the message-navigation fallback')
    async noSurfaceFallsBack() {
        const navigationCalls: number[] = [];
        const navigation: any = {
            scroll: (delta: number) => { navigationCalls.push(delta); return true; }
        };
        scrollAgentConsoleTranscript(undefined, navigation, () => undefined, -1);
        expect(navigationCalls).toEqual([-1]);
    }
}
