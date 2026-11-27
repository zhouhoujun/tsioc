import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderStateMatrixHtml } from '../scripts/state-matrix';

@Suite('common catalog state matrix')
export class CatalogStateMatrixTest {
    @Test('renders every state under every theme from the real components')
    async renders() {
        const html = await renderStateMatrixHtml();

        expect(html.match(/class="matrix-card"/g)?.length).toEqual(18);
        expect(html).toContain('data-theme-section="light"');
        expect(html).toContain('data-theme-section="dark"');
        expect(html).toContain('data-theme-section="high-contrast"');
        expect(html).toContain('data-menu-id="zoom:in"');
        expect(html).toContain('ui-data-table');
        expect(html).toContain('Saved');
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('NaN');
    }
}
