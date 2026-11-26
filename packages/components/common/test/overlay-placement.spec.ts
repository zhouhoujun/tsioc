import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { resolveFlippedPlacement, resolveOverlayShift } from '../src/overlay-placement';

function anchor(left: number, top: number, width = 20, height = 20): any {
    return {
        ownerDocument: { defaultView: { innerWidth: 200, innerHeight: 200 } },
        getBoundingClientRect: () => ({
            left, top, right: left + width, bottom: top + height, width, height
        })
    };
}

const popup = (width: number, height: number): any => ({
    getBoundingClientRect: () => ({ left: 0, top: 0, right: width, bottom: height, width, height })
});

@Suite('common overlay placement')
export class OverlayPlacementTest {
    @Test('keeps the preferred side when it fits')
    async keepsFitting() {
        const node = anchor(90, 80);
        expect(resolveFlippedPlacement(node, popup(40, 20), 'bottom')).toEqual('bottom');
        expect(resolveFlippedPlacement(node, popup(40, 20), 'right')).toEqual('right');
    }

    @Test('flips vertical and horizontal sides at the viewport edges')
    async flipsEdges() {
        expect(resolveFlippedPlacement(anchor(90, 180), popup(40, 20), 'bottom')).toEqual('top');
        expect(resolveFlippedPlacement(anchor(90, 0), popup(40, 20), 'top')).toEqual('bottom');
        expect(resolveFlippedPlacement(anchor(180, 90), popup(40, 20), 'right')).toEqual('left');
        expect(resolveFlippedPlacement(anchor(0, 90), popup(40, 20), 'left')).toEqual('right');
    }

    @Test('shifts centered overlays and edge-aligned popovers inside the viewport')
    async shiftsCrossAxis() {
        expect(resolveOverlayShift(anchor(0, 90), popup(50, 20), 'bottom', 6, true)).toEqual({ x: 21, y: 0 });
        expect(resolveOverlayShift(anchor(180, 90), popup(50, 20), 'bottom', 6, true)).toEqual({ x: -21, y: 0 });
        expect(resolveOverlayShift(anchor(180, 90), popup(30, 20), 'bottom', 6, false)).toEqual({ x: -16, y: 0 });
        expect(resolveOverlayShift(anchor(90, 0), popup(40, 30), 'right', 6, true)).toEqual({ x: 0, y: 11 });
        expect(resolveOverlayShift(anchor(90, 180), popup(40, 30), 'left', 6, false)).toEqual({ x: 0, y: -16 });
        expect(resolveOverlayShift(anchor(90, 90), popup(40, 20), 'top')).toEqual({ x: 0, y: 0 });
    }

    @Test('keeps the preferred side when neither side fits or rects are unavailable')
    async fallbacks() {
        expect(resolveFlippedPlacement(anchor(0, 0), popup(400, 400), 'bottom')).toEqual('bottom');
        expect(resolveFlippedPlacement(anchor(10, 10), popup(0, 0), 'right')).toEqual('right');
        expect(resolveFlippedPlacement({ getBoundingClientRect: () => ({}) }, popup(10, 10), 'top')).toEqual('top');
    }
}
