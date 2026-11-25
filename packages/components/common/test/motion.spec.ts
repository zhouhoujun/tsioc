import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { prefersReducedMotion, Spring, VelocityTracker } from '../motion';

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
