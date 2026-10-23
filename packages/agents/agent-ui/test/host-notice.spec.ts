import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { setHostConsoleNotice } from '../src/AgentConsoleHostNotice';

/**
 * Host adapters (CLI/TUI launcher, desktop, IDE) hold the started application
 * context. The console component's public `sessionState` getter returns the
 * reactive state the views depend on, so host notices must go through it;
 * writing `ctx.get(AgentConsoleSessionState)` directly landed on the raw
 * instance and never re-rendered (the approvals-endpoint notice was invisible).
 */
@Suite('host console notices')
export class HostNoticeTest {

    @Test('writes through the component sessionState')
    async writesThroughComponent() {
        const seen: string[] = [];
        const target = { sessionState: { setNotice: (message: string) => { seen.push(message); } } };
        expect(setHostConsoleNotice(target, 'Approvals API on http://127.0.0.1:1')).toBe(true);
        expect(seen).toEqual(['Approvals API on http://127.0.0.1:1']);
    }

    @Test('reports when no component state is available')
    async reportsMissingTarget() {
        expect(setHostConsoleNotice(undefined, 'x')).toBe(false);
        expect(setHostConsoleNotice(null, 'x')).toBe(false);
        expect(setHostConsoleNotice({}, 'x')).toBe(false);
        expect(setHostConsoleNotice({ sessionState: null }, 'x')).toBe(false);
    }
}
