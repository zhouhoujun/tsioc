import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ScrollBox } from '../src/scroll-box';

@Suite('console scroll box')
export class ConsoleScrollBoxTest {
    @Test('clamps the visible range to content and viewport')
    clampsRange() {
        const box = new ScrollBox();
        box.setMetrics(100, 10);
        expect(box.maxTop).toEqual(90);
        expect(box.atTop).toEqual(true);
        expect(box.atBottom).toEqual(false);
        expect(box.resolveVisibleRange()).toEqual({ start: 0, count: 10 });

        box.scrollToEdge('end');
        expect(box.top).toEqual(90);
        expect(box.atBottom).toEqual(true);
        expect(box.resolveVisibleRange()).toEqual({ start: 90, count: 10 });
        expect(box.isRowVisible(95)).toEqual(true);
        expect(box.isRowVisible(5)).toEqual(false);
    }

    @Test('sticky bottom follows content growth until a manual scroll')
    followsUntilManual() {
        const box = new ScrollBox({ stickyScroll: true, stickyStart: 'bottom' });
        box.setMetrics(100, 10);
        expect(box.top).toEqual(90);
        expect(box.following).toEqual(true);

        box.setContentHeight(120);
        expect(box.top).toEqual(110);

        box.scrollBy(-20);
        expect(box.top).toEqual(90);
        expect(box.manualScroll).toEqual(true);
        expect(box.following).toEqual(false);

        box.setContentHeight(140);
        expect(box.top).toEqual(90);
        expect(box.following).toEqual(false);
    }

    @Test('counts new items while scrolled away and resets when returning to bottom')
    countsNewItems() {
        const box = new ScrollBox({ stickyScroll: true, stickyStart: 'bottom' });
        box.setMetrics(100, 10);
        expect(box.noteNewItems(2)).toEqual(0);

        box.scrollBy(-30);
        expect(box.atBottom).toEqual(false);
        expect(box.noteNewItems(2)).toEqual(2);
        expect(box.noteNewItems(1)).toEqual(3);
        expect(box.newItemCount).toEqual(3);

        box.scrollToEdge('end');
        expect(box.newItemCount).toEqual(0);
        expect(box.following).toEqual(true);
    }

    @Test('resumeFollow re-engages sticky bottom and clears the counter')
    resumeFollow() {
        const box = new ScrollBox({ stickyScroll: true, stickyStart: 'bottom' });
        box.setMetrics(100, 10);
        box.scrollBy(-40);
        box.noteNewItems(5);
        expect(box.newItemCount).toEqual(5);

        box.resumeFollow();
        expect(box.top).toEqual(90);
        expect(box.following).toEqual(true);
        expect(box.newItemCount).toEqual(0);
    }

    @Test('maps keyboard navigation to viewport fractions and edges')
    keyboard() {
        const box = new ScrollBox();
        box.setMetrics(100, 10);
        box.scrollToEdge('end');
        expect(box.top).toEqual(90);

        box.handleKey('up');
        expect(box.top).toEqual(88);
        box.handleKey('pageup');
        expect(box.top).toEqual(83);
        box.handleKey('home');
        expect(box.top).toEqual(0);
        box.handleKey('end');
        expect(box.top).toEqual(90);
    }

    @Test('wheel scrolls by the configured row step')
    wheel() {
        const box = new ScrollBox({ wheelStep: 4 });
        box.setMetrics(100, 10);
        box.scrollToEdge('end');
        expect(box.wheel('up')).toEqual(true);
        expect(box.top).toEqual(86);
        expect(box.wheel('down')).toEqual(true);
        expect(box.top).toEqual(90);
    }

    @Test('scrollChildIntoView reveals the nearest edge only')
    childIntoView() {
        const box = new ScrollBox();
        box.setMetrics(100, 10);
        box.scrollTo(20);
        expect(box.scrollChildIntoView(5, 3)).toEqual(true);
        expect(box.top).toEqual(5);
        expect(box.scrollChildIntoView(40, 3)).toEqual(true);
        expect(box.top).toEqual(33);
        expect(box.scrollChildIntoView(35, 3)).toEqual(false);
        expect(box.top).toEqual(33);
        expect(box.scrollChildIntoView(0, 10)).toEqual(false);
    }
}
