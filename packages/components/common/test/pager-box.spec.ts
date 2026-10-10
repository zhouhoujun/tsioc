import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { PagerBox } from '../src/pager-box';

function linesFrom(builder: (index: number) => string, count: number): string[] {
    return Array.from({ length: count }, (_value, index) => builder(index));
}

@Suite('console pager box')
export class ConsolePagerBoxTest {
    @Test('windows content to the viewport and scrolls by row')
    windowsContent() {
        const pager = new PagerBox();
        pager.setContent(linesFrom(index => `line ${index}`, 30));
        pager.setViewportHeight(5);
        expect(pager.maxTop).toEqual(25);
        expect(pager.visibleLines()).toEqual(['line 0', 'line 1', 'line 2', 'line 3', 'line 4']);

        pager.scrollBy(10);
        expect(pager.top).toEqual(10);
        expect(pager.visibleLines()[0]).toEqual('line 10');

        pager.scrollToEdge('end');
        expect(pager.atBottom).toEqual(true);
        expect(pager.visibleLines().length).toEqual(5);
    }

    @Test('finds matches across rows and counts every hit')
    findsMatches() {
        const pager = new PagerBox();
        const lines = linesFrom(index => `line ${index}`, 20);
        lines[2] = 'foo foo bar';
        lines[10] = 'a foo b';
        pager.setContent(lines);

        const count = pager.search('foo');
        expect(count).toEqual(3);
        expect(pager.matchCount).toEqual(3);
        expect(pager.currentMatchIndex).toEqual(0);
        expect(pager.currentMatch?.row).toEqual(2);
        expect(pager.matchesAtRow(2).length).toEqual(2);
        expect(pager.matchesAtRow(10)[0].column).toEqual(2);
    }

    @Test('search is case-insensitive by default and case-sensitive when asked')
    caseSensitivity() {
        const pager = new PagerBox();
        pager.setContent(['Needle in a haystack']);

        expect(pager.search('needle')).toEqual(1);
        pager.clearQuery();
        expect(pager.search('needle', { caseSensitive: true })).toEqual(0);
        expect(pager.search('Needle', { caseSensitive: true })).toEqual(1);
    }

    @Test('next/prev match cycle and scroll the hit into view')
    async matchNavigation() {
        const pager = new PagerBox();
        const lines = linesFrom(index => `line ${index}`, 40);
        [5, 20, 35].forEach(row => { lines[row] = `hit ${row}`; });
        pager.setContent(lines);
        pager.setViewportHeight(5);

        pager.search('hit');
        expect(pager.currentMatch?.row).toEqual(5);
        expect(pager.isRowVisible(5)).toEqual(true);

        pager.nextMatch();
        expect(pager.currentMatch?.row).toEqual(20);
        expect(pager.isRowVisible(20)).toEqual(true);

        pager.nextMatch();
        expect(pager.currentMatch?.row).toEqual(35);
        pager.nextMatch();
        expect(pager.currentMatch?.row).toEqual(5); // wraps

        pager.prevMatch();
        expect(pager.currentMatch?.row).toEqual(35); // wraps back
    }

    @Test('closing keeps content but clears the active find')
    closeKeepsContent() {
        const pager = new PagerBox();
        pager.setContent(['one', 'two', 'three']);
        pager.open();
        pager.search('two');
        expect(pager.isOpen).toEqual(true);
        expect(pager.matchCount).toEqual(1);

        pager.close();
        expect(pager.isOpen).toEqual(false);
        expect(pager.matchCount).toEqual(0);
        expect(pager.query).toEqual('');
        expect(pager.contentHeight).toEqual(3);
        expect(pager.contentLines).toEqual(['one', 'two', 'three']);
    }

    @Test('keyboard navigation maps page fractions to the viewport')
    keyboardNavigation() {
        const pager = new PagerBox();
        pager.setContent(linesFrom(index => `line ${index}`, 100));
        pager.setViewportHeight(10);
        pager.scrollToEdge('end');
        expect(pager.top).toEqual(90);

        pager.handleKey('pageup');
        expect(pager.top).toEqual(85);
        pager.handleKey('home');
        expect(pager.top).toEqual(0);
        pager.handleKey('end');
        expect(pager.top).toEqual(90);
    }
}
