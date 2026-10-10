import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { handleTranscriptPagerInputView } from '../src/AgentConsoleTerminalInputController';

@Suite('transcript pager input routing')
export class TranscriptPagerInputTest {
    @Test('routes navigation, find and close into the base surface while open')
    routesKeys() {
        const calls: string[] = [];
        const host = {
            surfaceAccessor: {
                isPagerOpen: () => true,
                closePager: () => { calls.push('close'); return true; },
                pagerHandleKey: (key: string) => { calls.push(`key:${key}`); return true; },
                pagerTypeChar: (char: string) => { calls.push(`char:${char}`); return 1; },
                pagerBackspace: () => { calls.push('backspace'); return 1; }
            }
        } as any;

        expect(handleTranscriptPagerInputView(host, '\u001b[B')).toEqual(true);
        expect(handleTranscriptPagerInputView(host, '\u001b[5~')).toEqual(true);
        expect(handleTranscriptPagerInputView(host, 'h')).toEqual(true);
        expect(handleTranscriptPagerInputView(host, '\u007f')).toEqual(true);
        expect(handleTranscriptPagerInputView(host, '\u001b')).toEqual(true);
        expect(calls).toEqual(['key:down', 'key:pageup', 'char:h', 'backspace', 'close']);
    }

    @Test('passes through when closed; swallows unknown keys but not control keys when open')
    closedAndPassthrough() {
        const closed = { surfaceAccessor: { isPagerOpen: () => false } } as any;
        expect(handleTranscriptPagerInputView(closed, 'x')).toEqual(false);

        const open = { surfaceAccessor: { isPagerOpen: () => true, pagerHandleKey: () => true } } as any;
        expect(handleTranscriptPagerInputView(open, '\u001b[Z')).toEqual(true);
        expect(handleTranscriptPagerInputView(open, '\u0003')).toEqual(false);
    }
}
