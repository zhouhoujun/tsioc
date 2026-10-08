import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveConsoleTranscriptLayoutFlags } from '../src/terminal';

function lifecycle(overrides: Record<string, unknown> = {}) {
    return {
        getTerminalRoot: () => undefined,
        ...overrides
    } as any;
}

@Suite('console transcript layout')
export class ConsoleTranscriptLayoutTest {
    @Test('maps viewport to alternate screen and surface row scroll')
    viewport() {
        expect(resolveConsoleTranscriptLayoutFlags('viewport', lifecycle())).toEqual({
            nativeScrollback: false,
            scrollViewport: true,
            alternateScreen: true
        });
    }

    @Test('maps stream to native scrollback')
    stream() {
        expect(resolveConsoleTranscriptLayoutFlags('stream', lifecycle())).toEqual({
            nativeScrollback: true,
            scrollViewport: false,
            alternateScreen: false
        });
    }

    @Test('falls back to the lifecycle booleans when no layout mode is set')
    fallback() {
        expect(resolveConsoleTranscriptLayoutFlags(undefined, lifecycle({
            shouldUseNativeScrollback: () => true,
            shouldScrollViewport: () => false,
            shouldUseAlternateScreen: () => false
        }))).toEqual({
            nativeScrollback: true,
            scrollViewport: false,
            alternateScreen: false
        });
    }
}
