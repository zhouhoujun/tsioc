import expect = require('expect');
import { reactive } from '../src/reactive';
import { batchReactiveUpdates, DefaultReactiveEffect } from '../src/impl/effect';

describe('batchReactiveUpdates', () => {
    it('coalesces multiple writes into one effect pass', () => {
        const effect = new DefaultReactiveEffect();
        const state = reactive({ a: 1, b: 2 }, effect);
        let runs = 0;
        let observed: number[] = [];
        effect.run(() => {
            observed = [state.a, state.b];
            runs += 1;
        });
        expect(runs).toBe(1);

        batchReactiveUpdates(() => {
            state.a = 10;
            state.b = 20;
        });
        expect(runs).toBe(2);
        expect(observed).toEqual([10, 20]);
    });

    it('keeps ordinary writes synchronous outside a batch', () => {
        const effect = new DefaultReactiveEffect();
        const state = reactive({ value: 1 }, effect);
        let runs = 0;
        effect.run(() => {
            void state.value;
            runs += 1;
        });
        state.value = 2;
        expect(runs).toBe(2);
    });
});
