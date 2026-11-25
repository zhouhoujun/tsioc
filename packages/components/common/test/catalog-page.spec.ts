import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderCatalogHtml } from '../catalog/page';
import type { WidgetCatalogEntry } from '../catalog/types';

const entries: WidgetCatalogEntry[] = [
    {
        name: 'dialog',
        selector: 'ui-dialog',
        summary: 'Dialog <shell> & actions',
        attributes: [
            { name: 'title', type: 'string', default: "''" },
            { name: 'overlayOpen', type: 'boolean', default: 'false' }
        ],
        keyboard: ['Escape: close'],
        surfaces: { html: 'Backdrop', console: 'Overlay above composer' },
        examples: [{ title: 'Confirm', props: { title: 'Delete?' } }]
    },
    {
        name: 'search-list',
        selector: 'ui-search-list',
        summary: 'Searchable list',
        attributes: []
    }
];

@Suite('common catalog static page')
export class CatalogPageTest {
    @Test('renders nav, attribute tables, keyboard and examples with escaping')
    async rendersPage() {
        const html = renderCatalogHtml(entries);
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('2 renderer-neutral widgets');
        expect(html).toContain('href="#widget-dialog"');
        expect(html).toContain('ui-dialog');
        expect(html).toContain('<code>title</code>');
        expect(html).toContain('Escape: close');
        expect(html).toContain('Backdrop');
        expect(html).toContain('Delete?');
        expect(html).toContain('Dialog &lt;shell&gt; &amp; actions');
        expect(html).not.toContain('<shell>');
        expect(html.indexOf('widget-dialog')).toBeLessThan(html.indexOf('widget-search-list'));
    }
}
