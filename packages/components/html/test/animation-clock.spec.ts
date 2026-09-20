import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { BrowserAnimationClock } from '../src';

@Suite('browser animation clock')
export class BrowserAnimationClockTest {
    @Test('uses requestAnimationFrame and stops after the last unsubscribe')
    drivesAndStops() {
        const host = globalThis as typeof globalThis & {
            requestAnimationFrame?: (callback: (timestamp: number) => void) => number;
            cancelAnimationFrame?: (handle: number) => void;
        };
        const originalRequest = host.requestAnimationFrame;
        const originalCancel = host.cancelAnimationFrame;
        let callback: ((timestamp: number) => void) | undefined;
        let cancelled = 0;
        host.requestAnimationFrame = next => { callback = next; return 7; };
        host.cancelAnimationFrame = handle => { cancelled = handle; };
        try {
            const clock = new BrowserAnimationClock();
            let ticks = 0;
            const listener = () => ticks += 1;
            clock.subscribe(listener);
            expect(callback).toBeDefined();
            callback!(16);
            expect(ticks).toEqual(1);
            clock.unsubscribe(listener);
            expect(cancelled).toEqual(7);
        } finally {
            host.requestAnimationFrame = originalRequest;
            host.cancelAnimationFrame = originalCancel;
        }
    }
}
