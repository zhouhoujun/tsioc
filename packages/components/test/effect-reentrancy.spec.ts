import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { reactive } from '../src/reactive';
import { DefaultReactiveEffect } from '../src/impl/effect';

/**
 * Guards the reactive core against unbounded re-entrancy.
 *
 * Two effects that each read the other's written key form a feedback cycle.
 * The core must bound this (defer re-entrant re-runs instead of recursing),
 * otherwise a single `set` can recurse until the JS stack overflows — which is
 * what produced multi-minute UI stalls / spun CPU in the agent console.
 */
const MAX_EFFECT_RUNS = 500;

@Suite('ReactiveEffect re-entrancy')
export class ReactiveReentrancySpec {
    @Test('mutual effect writes are bounded (no unbounded recursion)')
    mutualWritesAreBounded() {
        const effect = new DefaultReactiveEffect();
        const target: any = { a: 0, b: 0 };
        const proxy = reactive(target, effect);

        let count = 0;
        const tick = () => {
            count += 1;
            if (count > MAX_EFFECT_RUNS) {
                throw new Error(`unbounded re-entrancy: effects ran ${count} times`);
            }
        };
        const effectA = () => { tick(); proxy.b = (proxy.a as number) + 1; };
        const effectB = () => { tick(); proxy.a = (proxy.b as number) + 1; };

        let failure: Error | undefined;
        try {
            effect.run(effectA);
            effect.run(effectB);
        } catch (error: any) {
            failure = error;
        }

        expect(failure?.message).toBeUndefined();
        expect(count).toBeLessThanOrEqual(MAX_EFFECT_RUNS);
    }

    @Test('a single write still propagates synchronously to dependents')
    singleWritePropagates() {
        const effect = new DefaultReactiveEffect();
        const target: any = { value: 0, mirror: -1 };
        const proxy = reactive(target, effect);

        let mirrorSeen: number | undefined;
        effect.run(() => {
            mirrorSeen = proxy.value as number;
        });
        proxy.value = 7;

        // The dependent binding must have re-run synchronously within the set.
        expect(mirrorSeen).toBe(7);
    }
}
