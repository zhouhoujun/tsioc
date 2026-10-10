import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DomScrollBox } from '../src/scroll-box-dom';

class FakeElement {
    scrollTop = 0;
    constructor(public scrollHeight: number, public clientHeight: number) {}
}

@Suite('dom scroll box')
export class DomScrollBoxTest {
    @Test('mirrors the native scroll position and reflects atBottom')
    mirrorsNativePosition() {
        const element = new FakeElement(500, 100);
        const box = new DomScrollBox(element);
        expect(box.atBottom).toEqual(false); // scrollTop 0, maxTop 400

        element.scrollTop = 400; // native scroll to the bottom
        box.sync();
        expect(box.atBottom).toEqual(true);
        expect(box.following).toEqual(true);
    }

    @Test('wheel scrolls by the given delta and clamps to bounds')
    wheelWithinBounds() {
        const element = new FakeElement(500, 100);
        const box = new DomScrollBox(element);
        element.scrollTop = 400;
        box.sync();

        expect(box.wheel(-150)).toEqual(true);
        expect(element.scrollTop).toEqual(250);
        expect(box.wheel(-400)).toEqual(true);
        expect(element.scrollTop).toEqual(0); // clamped at the top
        expect(box.wheel(60)).toEqual(true);
        expect(element.scrollTop).toEqual(60);
    }

    @Test('scrollToBottom pins to the latest content and clears new items')
    scrollToBottomPins() {
        const element = new FakeElement(500, 100);
        const box = new DomScrollBox(element);
        element.scrollTop = 100;
        box.sync();
        expect(box.noteNewItems(2)).toEqual(2);

        box.scrollToBottom();
        expect(element.scrollTop).toEqual(400);
        expect(box.atBottom).toEqual(true);
        expect(box.newItemCount).toEqual(0);
    }
}
