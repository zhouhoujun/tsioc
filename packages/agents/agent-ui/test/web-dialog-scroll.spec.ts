import expect = require('expect');
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Web dialog chrome must keep its title and actions fixed; only the inner body
 * scrolls. These assertions read the stylesheet because JSDOM does not compute
 * stylesheet overflow.
 */
describe('Web console dialog scrolling', () => {
    const css = readFileSync(join(__dirname, '../web/console.css'), 'utf8');

    function rule(selector: string): string {
        const index = css.indexOf(selector);
        if (index < 0) {
            return '';
        }
        const end = css.indexOf('}', index);
        return end < 0 ? '' : css.slice(index, end + 1);
    }

    it('keeps the dialog card fixed and scrolls only the body', () => {
        const card = rule('#agent-console [renderregion="menu"] > .console-panel,');
        expect(card).toBeTruthy();
        expect(card).toContain('overflow: hidden');
        expect(card).not.toContain('overflow: auto');

        const body = rule('#agent-console dialog-panel > .console-panel > .dialog-body,');
        expect(body).toBeTruthy();
        expect(body).toContain('flex: 1 1 auto');
        expect(body).toContain('min-height: 0');
    });

    it('scrolls menu rows and approval rows instead of the card', () => {
        const selectRows = rule('#agent-console [renderregion="menu"] .console-panel.select-list > .select-shell > .select-rows,');
        expect(selectRows).toContain('flex: 1 1 auto');
        expect(selectRows).toContain('min-height: 0');
        expect(css).not.toContain('#agent-console [renderregion="menu"] > .console-panel {\n    display: block;');

        const approvalBody = rule('#agent-console .console-approvals-panel .approval-body {');
        expect(approvalBody).toContain('overflow: auto');
        expect(approvalBody).toContain('min-height: 0');

        const listBody = rule('#agent-console agent-console-pending-question-panel .console-panel.list-panel > .list,');
        expect(listBody).toContain('flex: 1 1 auto');
    });
});
