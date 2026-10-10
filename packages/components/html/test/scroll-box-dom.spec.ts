import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DomScrollBox } from '../src/scroll-box-dom';

class FakeElement {
    scrollTop = 0;
    constructor(public scrollHeight: number, public clientHeight: number) {}
}

@Suite('dom scroll box')
export class DomScrollBoxTest {
    @Test('sticks to the bottom, detaches on manual scroll, and re-follows at the end')
    followsAndDetaches() {
        const element = new FakeElement(1000, 100);
        const box = new DomScrollBox(element);

        box.sync();
        expect(element.scrollTop).toEqual(900);
        expect(box.following).toEqual(true);

        box.wheel(-50);
        expect(element.scrollTop).toEqual(850);
        expect(box.following).toEqual(false);

        // Content grows while scrolled away: the reading position holds and new items are counted.
        element.scrollHeight = 1200;
        box.sync();
        expect(element.scrollTop).toEqual(850);
        expect(box.noteNewItems(2)).toEqual(2);
        expect(box.newItemCount).toEqual(2);

        box.scrollToEdge('end');
        expect(element.scrollTop).toEqual(1100);
        expect(box.following).toEqual(true);
        expect(box.newItemCount).toEqual(0);
    }

    @Test('wheel scrolls by the given delta within bounds')
    wheelWithinBounds() {
        const element = new FakeElement(500, 100);
        const box = new DomScrollBox(element);
        box.sync();
        expect(element.scrollTop).toEqual(400); // initial sticky bottom

        expect(box.wheel(-150)).toEqual(true);
        expect(element.scrollTop).toEqual(250);
        expect(box.wheel(-400)).toEqual(true);
        expect(element.scrollTop).toEqual(0); // clamped at the top
        expect(box.wheel(60)).toEqual(true);
        expect(element.scrollTop).toEqual(60);
    }
}
