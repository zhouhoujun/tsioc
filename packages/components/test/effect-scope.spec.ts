import expect = require('expect');
import { reactive } from '../src/reactive';
import { DefaultReactiveEffect } from '../src/impl/effect';

describe('ReactiveEffect scope', () => {

    it('removes binding dependencies when the scope is disposed', () => {
        const effect = new DefaultReactiveEffect();
        const state: any = reactive({ value: 0, other: 0 }, effect);
        const scope = effect.createScope();
        let runs = 0;

        scope.run(() => {
            effect.run(() => {
                void state.value;
                runs += 1;
            });
        });
        expect(runs).toBe(1);

        state.value = 1;
        expect(runs).toBe(2);

        scope.dispose();

        state.value = 2;
        state.other = 2;
        expect(runs).toBe(2);
    });

    it('removes deps first discovered on a later re-run', () => {
        const effect = new DefaultReactiveEffect();
        const state: any = reactive({ flag: false, left: 0, right: 0 }, effect);
        const scope = effect.createScope();
        let runs = 0;

        scope.run(() => {
            effect.run(() => {
                void (state.flag ? state.left : state.right);
                runs += 1;
            });
        });
        expect(runs).toBe(1);

        state.flag = true;
        expect(runs).toBe(2);

        scope.dispose();

        state.left = 1;
        state.right = 1;
        expect(runs).toBe(2);
    });

    it('isolates proxies per effect', () => {
        const first = new DefaultReactiveEffect();
        const second = new DefaultReactiveEffect();
        const raw = { value: 0 };

        const firstState: any = reactive(raw, first);
        const secondState: any = reactive(raw, second);
        expect(firstState).not.toBe(secondState);

        let firstRuns = 0;
        let secondRuns = 0;
        first.run(() => { void firstState.value; firstRuns += 1; });
        second.run(() => { void secondState.value; secondRuns += 1; });

        firstState.value = 1;
        expect(firstRuns).toBe(2);
        expect(secondRuns).toBe(2);
        expect(secondState.value).toBe(1);

        secondState.value = 2;
        expect(firstRuns).toBe(3);
        expect(secondRuns).toBe(3);
        expect(firstState.value).toBe(2);
        expect(secondState.value).toBe(2);
    });

    it('keeps dependency cleanup for nested targets', () => {
        const effect = new DefaultReactiveEffect();
        const state: any = reactive({ nested: { count: 0 } }, effect);
        const scope = effect.createScope();
        let runs = 0;

        scope.run(() => {
            effect.run(() => {
                void state.nested.count;
                runs += 1;
            });
        });

        state.nested.count = 1;
        expect(runs).toBe(2);

        scope.dispose();

        state.nested.count = 2;
        expect(runs).toBe(2);
    });
});
