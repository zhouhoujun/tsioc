import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { formatConsoleTerminalNotification } from '../src/terminal';

/**
 * OSC 9 is the de-facto desktop-notification sequence for terminal emulators.
 * The formatter must stay a single printable sequence: tool names and model
 * output can contain control bytes that would otherwise inject escapes.
 */
@Suite('terminal notifications')
export class TerminalNotificationTest {
    @Test('wraps title and body in one OSC 9 sequence')
    notificationSequence() {
        expect(formatConsoleTerminalNotification('TSDI Agent', 'Turn finished: Alpha'))
            .toEqual('\u001b]9;TSDI Agent: Turn finished: Alpha\u0007');
    }

    @Test('strips control bytes and collapses whitespace')
    controlBytes() {
        const sequence = formatConsoleTerminalNotification('Agent\u0007\u001b[31m', 'line\none\r\n  two');
        expect(sequence).toEqual('\u001b]9;Agent [31m: line one two\u0007');
        // Exactly one BEL terminator, and no embedded escape other than the OSC start.
        expect(sequence.endsWith('\u0007')).toEqual(true);
        expect(sequence.slice(0, -1).includes('\u0007')).toEqual(false);
    }

    @Test('falls back to a product name for empty copy')
    emptyCopy() {
        expect(formatConsoleTerminalNotification('', '')).toEqual('\u001b]9;TSDI Agent\u0007');
    }

    @Test('caps very long bodies so the terminal is not flooded')
    capsLength() {
        const sequence = formatConsoleTerminalNotification('Title', 'x'.repeat(600));
        expect(sequence.length).toBeLessThan(320);
    }
}
