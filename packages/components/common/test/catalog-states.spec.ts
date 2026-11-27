import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeStateMarkup, renderStateMatrix } from '../scripts/state-matrix';

@Suite('common catalog state matrix')
export class CatalogStateMatrixTest {
    @Test('renders every state under every theme from the real components')
    async renders() {
        const report = await renderStateMatrix();
        const html = report.html;

        expect(html.match(/class="matrix-card"/g)?.length).toEqual(18);
        expect(html).toContain('data-theme-section="light"');
        expect(html).toContain('data-theme-section="dark"');
        expect(html).toContain('data-theme-section="high-contrast"');
        expect(html).toContain('data-menu-id="zoom:in"');
        expect(html).toContain('ui-data-table');
        expect(html).toContain('Saved');
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('NaN');
        const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g)).map(match => match[1]);
        expect(ids.length).toBeGreaterThan(0);
        expect(new Set(ids).size).toEqual(ids.length);
        const idSet = new Set(ids);
        const missing: string[] = [];
        for (const ref of html.matchAll(/aria-(?:labelledby|describedby|controls|activedescendant|owns)="([^"]*)"/g)) {
            for (const id of ref[1].split(/\s+/).filter(Boolean)) {
                if (!idSet.has(id)) {
                    missing.push(id);
                }
            }
        }
        expect(missing).toEqual([]);

        const baseline = JSON.parse(readFileSync(join(__dirname, '..', 'scripts', 'catalog-states-baseline.json'), 'utf8')) as Record<string, string>;
        expect(Object.keys(report.states).sort()).toEqual(Object.keys(baseline).sort());
        for (const [state, markup] of Object.entries(report.states)) {
            const hash = createHash('sha1').update(normalizeStateMarkup(markup)).digest('hex');
            expect(`${state}:${hash}`).toEqual(`${state}:${baseline[state]}`);
        }
    }
}
