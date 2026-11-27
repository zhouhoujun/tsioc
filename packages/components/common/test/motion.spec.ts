import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { observeReducedMotion, prefersReducedMotion, Spring, VelocityTracker, VelocityTracker2D } from '../motion';

@Suite('common motion primitives')
export class MotionTest {
    @Test('a critically damped spring converges without overshooting')
    async criticalSpring() {
        const spring = new Spring({ value: 0, target: 100, stiffness: 170, damping: 2 * Math.sqrt(170) });
        let previous = spring.value;
        for (let frame = 0; frame < 240; frame++) {
            const value = spring.step(16);
            expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
            expect(value).toBeLessThanOrEqual(100.0001);
            previous = value;
        }
        expect(spring.value).toEqual(100);
        expect(spring.atRest()).toEqual(true);
        expect(spring.velocity).toEqual(0);
    }

    @Test('an underdamped spring overshoots and still settles')
    async underdampedSpring() {
        const spring = new Spring({ value: 0, target: 100, stiffness: 170, damping: 8 });
        let max = 0;
        for (let frame = 0; frame < 400; frame++) {
            max = Math.max(max, spring.step(16));
        }
        expect(max).toBeGreaterThan(100);
        expect(spring.value).toEqual(100);
    }

    @Test('large frame deltas are clamped and snapping is immediate')
    async clampsAndSnaps() {
        const spring = new Spring({ value: 0, target: 10 });
        spring.step(10_000);
        expect(Number.isFinite(spring.value)).toEqual(true);
        expect(Math.abs(spring.value)).toBeLessThanOrEqual(10);
        spring.snap(42);
        expect(spring.value).toEqual(42);
        expect(spring.velocity).toEqual(0);
    }

    @Test('duration/bounce springs validate and settle')
    async durationSpring() {
        const spring = Spring.fromDuration(0, { duration: 0.4, bounce: 0.2, target: 10 });
        for (let frame = 0; frame < 120; frame++) spring.step(16);
        expect(spring.value).toEqual(10);
        expect(spring.resting).toEqual(true);
        expect(() => Spring.fromDuration(0, { duration: 0, bounce: 0 })).toThrow();
        expect(() => Spring.fromDuration(0, { duration: 1, bounce: 1 })).toThrow();
    }

    @Test('2D velocity uses a time window and follows reduced-motion changes')
    async velocity2dAndReduced() {
        const tracker = new VelocityTracker2D(90);
        tracker.record(0, 0, 0);
        tracker.record(10, 20, 50);
        expect(tracker.velocity(60)).toEqual({ x: 200, y: 400 });
        expect(tracker.velocity(200)).toEqual({ x: 0, y: 0 });
        tracker.record(5, 5, 10);
        expect(tracker.velocity()).toEqual({ x: 0, y: 0 });

        let listener: (() => void) | undefined;
        let matches = false;
        const query = {
            get matches() { return matches; },
            addEventListener(_type: 'change', next: () => void) { listener = next; },
            removeEventListener() { listener = undefined; }
        };
        const host = { matchMedia: () => query };
        let changes = 0;
        const stop = observeReducedMotion(host, () => { changes += 1; });
        expect(prefersReducedMotion(host)).toEqual(false);
        matches = true;
        listener?.();
        expect(prefersReducedMotion(host)).toEqual(true);
        expect(changes).toEqual(1);
        stop();
        expect(listener).toBeUndefined();
        expect(observeReducedMotion(undefined, () => undefined)()).toBeUndefined();
    }

    @Test('velocity tracker reports units per millisecond and the host motion preference')
    async velocityAndPreference() {
        const tracker = new VelocityTracker(3);
        tracker.record(0, 0);
        tracker.record(30, 100);
        tracker.record(90, 200);
        expect(tracker.velocity()).toEqual(0.45);
        tracker.reset();
        expect(tracker.velocity()).toEqual(0);

        expect(prefersReducedMotion()).toEqual(false);
        expect(prefersReducedMotion({ matchMedia: () => ({ matches: true }) })).toEqual(true);
        expect(prefersReducedMotion({ matchMedia: () => { throw new Error('nope'); } })).toEqual(false);
    }
}

import { createFrameLoop } from '../motion/src/frame-loop';

@Suite('common frame loop')
export class FrameLoopTest {
    @Test('runs reads before writes, clamps dt and stops completed jobs')
    async steps() {
        let callback: ((time: number) => void) | undefined;
        const loop = createFrameLoop({
            request: (next) => { callback = next; return 1; },
            cancel: () => { callback = undefined; }
        });
        const order: string[] = [];
        const deltas: number[] = [];
        let frames = 0;
        loop.add(dt => {
            order.push('write');
            deltas.push(dt);
            frames += 1;
            return frames < 2;
        }, () => order.push('read'));
        frame();
        expect(order).toEqual(['read', 'write']);
        expect(deltas[0]).toEqual(1000 / 60);
        frame();
        expect(deltas[1]).toEqual(16);
        expect(loop.size).toEqual(0);

        const stop = loop.add(() => true);
        expect(loop.size).toEqual(1);
        stop();
        stop();
        expect(loop.size).toEqual(0);

        function frame() {
            const next = callback;
            callback = undefined;
            next?.(deltas.length ? 16 : 0);
        }
    }

    @Test('a throwing job is removed and the error propagates')
    async throws() {
        let callback: ((time: number) => void) | undefined;
        const loop = createFrameLoop({
            request: (next) => { callback = next; return 1; },
            cancel: () => { callback = undefined; }
        });
        loop.add(() => { throw new Error('boom'); });
        let message = '';
        try {
            callback?.(0);
        } catch (error) {
            message = error instanceof Error ? error.message : String(error);
        }
        expect(message).toEqual('boom');
        expect(loop.size).toEqual(0);
    }
}
