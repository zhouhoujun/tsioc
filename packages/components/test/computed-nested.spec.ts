import expect = require('expect');
import { getClassRef } from '@tsdi/ioc';
import { Computed, ComputedMetadata } from '../src/decorators/computed';
import { reactive } from '../src/reactive';
import { DefaultReactiveEffect } from '../src/impl/effect';

function computedsOf(type: any): ComputedMetadata[] {
    return getClassRef(type)
        .getDefines(Computed)
        .map(define => define.metadata as ComputedMetadata);
}

describe('Computed nested proxy dependencies', () => {

    it('invalidates when a nested object field changes', () => {
        let calls = 0;
        class State {
            user = { name: 'a' };

            @Computed()
            get label() {
                calls += 1;
                return this.user.name;
            }
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, computedsOf(State));

        let seen: string;
        let runs = 0;
        effect.run(() => {
            seen = state.label;
            runs += 1;
        });

        expect(seen!).toBe('a');
        expect(runs).toBe(1);

        // Cache hit: no recompute while dependencies are unchanged.
        expect(state.label).toBe('a');
        expect(calls).toBe(1);

        state.user.name = 'b';
        expect(runs).toBe(2);
        expect(state.label).toBe('b');
        expect(calls).toBe(2);
    });

    it('invalidates when a nested object is replaced or deleted', () => {
        class State {
            user: { name?: string } = { name: 'a' };

            @Computed()
            get label() {
                return this.user.name;
            }
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, computedsOf(State));

        let seen: any;
        effect.run(() => { seen = state.label; });

        state.user = { name: 'b' };
        expect(seen).toBe('b');

        delete state.user.name;
        expect(seen).toBeUndefined();
    });

    it('subscribes every binding that reads a cached computed value', () => {
        class State {
            first = 'a';

            @Computed()
            get upper() {
                return this.first.toUpperCase();
            }
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, computedsOf(State));

        let a: string;
        let b: string;
        effect.run(() => { a = state.upper; });
        effect.run(() => { b = state.upper; });

        expect(a!).toBe('A');
        expect(b!).toBe('A');

        state.first = 'b';
        expect(a!).toBe('B');
        expect(b!).toBe('B');
    });

    it('tracks deps of a compute function through the proxy', () => {
        let calls = 0;
        class State {
            nested = { n: 2 };
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, [
            {
                propertyKey: 'doubled',
                cache: true,
                compute: (instance: any) => {
                    calls += 1;
                    return instance.nested.n * 2;
                }
            } as ComputedMetadata
        ]);

        let seen = 0;
        effect.run(() => { seen = state.doubled; });
        expect(seen).toBe(4);
        expect(calls).toBe(1);

        // Cache hit.
        expect(state.doubled).toBe(4);
        expect(calls).toBe(1);

        state.nested.n = 5;
        expect(seen).toBe(10);
        expect(calls).toBe(2);
    });

    it('propagates invalidation through nested computed properties', () => {
        class State {
            first = 'a';

            @Computed()
            get upper() {
                return this.first.toUpperCase();
            }

            @Computed()
            get decorated() {
                return `<${this.upper}>`;
            }
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, computedsOf(State));

        let seen: string;
        effect.run(() => { seen = state.decorated; });
        expect(seen!).toBe('<A>');

        state.first = 'b';
        expect(seen!).toBe('<B>');
    });

    it('recomputes on every read when cache is false', () => {
        let calls = 0;
        class State {
            value = 1;
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, [
            {
                propertyKey: 'trebled',
                cache: false,
                compute: (instance: any) => {
                    calls += 1;
                    return instance.value * 3;
                }
            } as ComputedMetadata
        ]);

        expect(state.trebled).toBe(3);
        expect(state.trebled).toBe(3);
        expect(calls).toBe(2);
    });

    it('reacts to array element and length changes', () => {
        class State {
            items = [{ done: false }, { done: true }];

            @Computed()
            get remaining() {
                return this.items.filter(item => !item.done).length;
            }
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, computedsOf(State));

        let seen = 0;
        effect.run(() => { seen = state.remaining; });
        expect(seen).toBe(1);

        state.items[0].done = true;
        expect(seen).toBe(0);

        state.items = [...state.items, { done: false }];
        expect(seen).toBe(1);
    });

    it('does not overflow on circular computed properties', () => {
        class State {
            @Computed()
            get a(): any {
                return (this as any).b;
            }

            @Computed()
            get b(): any {
                return (this as any).a;
            }
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, computedsOf(State));

        expect(() => effect.run(() => { void state.a; })).not.toThrow();
    });

    it('does not keep a stale value after a throwing computed read', () => {
        let shouldThrow = true;
        class State {
            value = 2;
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, [
            {
                propertyKey: 'result',
                cache: true,
                compute: (instance: any) => {
                    if (shouldThrow) {
                        throw new Error('boom');
                    }
                    return instance.value * 2;
                }
            } as ComputedMetadata
        ]);

        expect(() => state.result).toThrow();
        shouldThrow = false;
        expect(state.result).toBe(4);
    });

    it('does not loop when a computed writes its own counter', () => {
        let calls = 0;
        class State {
            value = 2;
            calls = 0;
        }

        const effect = new DefaultReactiveEffect();
        const state: any = reactive(new State(), effect, [
            {
                propertyKey: 'result',
                cache: true,
                compute: (instance: any) => {
                    calls += 1;
                    instance.calls += 1;
                    return instance.value * 2;
                }
            } as ComputedMetadata
        ]);

        expect(state.result).toBe(4);
        expect(calls).toBe(1);

        state.value = 3;
        expect(state.result).toBe(6);
        expect(calls).toBe(2);
    });
});
