import expect = require('expect');
import { readFileSync } from 'fs';
import { join } from 'path';

/** Keep common widgets embedded in the web console on the console theme. */
describe('Web console common token bridge', () => {
    const css = readFileSync(join(__dirname, '../web/console.css'), 'utf8');

    it('maps --ui-* to the agent web theme variables', () => {
        for (const [token, source] of [
            ['--ui-bg', '--agent-web-bg'],
            ['--ui-card-bg', '--agent-web-panel'],
            ['--ui-border', '--agent-web-border'],
            ['--ui-link-fg', '--agent-web-link'],
            ['--ui-danger-fg', '--agent-web-danger'],
            ['--ui-data-table-head-bg', '--agent-web-table-head']
        ]) {
            expect(css).toContain(`${token}: var(${source})`);
        }
    });
});
