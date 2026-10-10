import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { JSDOM } from 'jsdom';
import { PagerBox, composePagerViewLines } from '@tsdi/components/common';
import { renderPagerView } from '../src/pager-dom';

@Suite('dom pager view')
export class DomPagerViewTest {
    @Test('renders the hud plus highlighted body rows from the shared view')
    rendersView() {
        const dom = new JSDOM('<!DOCTYPE html><body><div id="p"></div></body>');
        const doc = dom.window.document;
        const container = doc.getElementById('p') as HTMLElement;

        const pager = new PagerBox();
        pager.setContent(['alpha', 'beta needle and needle', 'gamma']);
        pager.setViewportHeight(10);
        pager.search('needle');

        renderPagerView(doc, container, composePagerViewLines(pager));

        expect(container.querySelector('.pager-hud')?.textContent).toContain('Pager 1/2');
        expect(container.querySelector('.pager-match-current')?.textContent).toEqual('needle');
        expect(container.querySelectorAll('.pager-match').length).toEqual(1);
        expect(container.querySelectorAll('.pager-line').length).toEqual(3);
        expect(container.textContent).toContain('beta needle and needle');
    }
}
