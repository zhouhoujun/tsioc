import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { reactive } from '../src/reactive';
import { DefaultReactiveEffect } from '../src/impl/effect';

@Suite('ReactiveEffect dependency cleanup')
export class EffectDependencyCleanupTest {
    @Test('drops dependencies a branch stopped reading')
    dropsStaleBranchDependencies() {
        const effect = new DefaultReactiveEffect();
        const state: any = reactive({ flag: false, left: 0, right: 0 }, effect);
        let runs = 0;

        effect.run(() => {
            if (state.flag) {
                void state.left;
            } else {
                void state.right;
            }
            runs += 1;
        });
        expect(runs).toBe(1);

        state.flag = true;
        expect(runs).toBe(2);

        // `right` is no longer read by the active branch.
        state.right = 10;
        expect(runs).toBe(2);

        state.left = 10;
        expect(runs).toBe(3);

        state.flag = false;
        expect(runs).toBe(4);

        state.left = 11;
        expect(runs).toBe(4);

        state.right = 11;
        expect(runs).toBe(5);
    }

    @Test('keeps previous dependencies when a binding throws')
    keepsDependenciesAfterThrow() {
        const effect = new DefaultReactiveEffect();
        const state: any = reactive({ explode: false, first: 0, second: 0 }, effect);
        let runs = 0;

        effect.run(() => {
            void state.first;
            if (state.explode) {
                throw new Error('boom');
            }
            void state.second;
            runs += 1;
        });
        expect(runs).toBe(1);

        expect(() => { state.explode = true; }).toThrow();
        // The failed run had not read `second`; it must still be a dependency.
        expect(() => { state.second = 2; }).toThrow();

        state.explode = false;
        expect(runs).toBe(2);
    }
}
