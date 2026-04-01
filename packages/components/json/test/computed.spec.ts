import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { isReactive, canReactive, reactive, noReact } from '@tsdi/components';
import { ReactiveEffect } from '@tsdi/components';

class TestEffect extends ReactiveEffect<void> {
    private _active = true;
    private tracks: Array<{ target: object, key: string | symbol }> = [];
    private triggers: Array<{ target: object, key: string | symbol }> = [];

    track(target: object, key: string | symbol): void {
        this.tracks.push({ target, key });
    }

    trigger(target: object, key: string | symbol): void {
        this.triggers.push({ target, key });
    }

    run<T>(fn: () => T): T {
        return fn();
    }

    stop(): void {
        this._active = false;
    }

    get active(): boolean {
        return this._active;
    }

    getTrackCount(): number {
        return this.tracks.length;
    }

    getTriggerCount(): number {
        return this.triggers.length;
    }

    getTracks() {
        return this.tracks;
    }

    getTriggers() {
        return this.triggers;
    }

    clear() {
        this.tracks = [];
        this.triggers = [];
    }
}

@Suite('Computed Property Tests')
export class ComputedPropertyTest {

    effect!: TestEffect;

    @Before()
    async init() {
        this.effect = new TestEffect();
    }

    @Test('should track property access on reactive object')
    testTrackPropertyAccess() {
        const obj = { name: 'test', value: 123 };
        const proxy = reactive(obj, this.effect);

        const name = proxy.name;
        const value = proxy.value;

        expect(this.effect.getTrackCount()).toBeGreaterThanOrEqual(2);
        expect(name).toBe('test');
        expect(value).toBe(123);
    }

    @Test('should trigger on property change')
    testTriggerOnChange() {
        const obj = { count: 0 };
        const proxy = reactive(obj, this.effect);

        proxy.count = 1;

        expect(this.effect.getTriggerCount()).toBe(1);
        expect(proxy.count).toBe(1);
    }

    @Test('should not trigger when setting same value')
    testNoTriggerOnSameValue() {
        const obj = { count: 0 };
        const proxy = reactive(obj, this.effect);

        this.effect.clear();

        proxy.count = 0;

        expect(this.effect.getTriggerCount()).toBe(0);
    }

    @Test('should track nested object access')
    testTrackNestedObjectAccess() {
        const obj = { nested: { value: 42 } };
        const proxy = reactive(obj, this.effect);

        const nestedValue = proxy.nested.value;

        expect(nestedValue).toBe(42);
        expect(this.effect.getTrackCount()).toBeGreaterThan(0);
    }

    @Test('should trigger on property delete')
    testTriggerOnDelete() {
        const obj = { name: 'test' };
        const proxy = reactive(obj, this.effect);

        delete proxy.name;

        expect(this.effect.getTriggerCount()).toBe(1);
    }

    @Test('should handle has operator')
    testHasOperator() {
        const obj = { a: 1, b: 2 };
        const proxy = reactive(obj, this.effect);

        expect('a' in proxy).toBe(true);
        expect('c' in proxy).toBe(false);

        expect(this.effect.getTrackCount()).toBeGreaterThanOrEqual(2);
    }

    @Test('should handle ownKeys for Object.keys')
    testOwnKeys() {
        const obj = { a: 1, b: 2, c: 3 };
        const proxy = reactive(obj, this.effect);

        const keys = Object.keys(proxy);

        expect(keys.sort()).toEqual(['a', 'b', 'c']);
    }

    @Test('should handle multiple property changes')
    testMultipleChanges() {
        const obj = { x: 1, y: 2, z: 3 };
        const proxy = reactive(obj, this.effect);

        this.effect.clear();

        proxy.x = 10;
        proxy.y = 20;
        proxy.z = 30;

        expect(this.effect.getTriggerCount()).toBe(3);
    }

    @Test('should track computed nested reactive objects')
    testTrackNestedReactive() {
        const inner = { value: 1 };
        const outer = { inner: inner };
        const proxy = reactive(outer, this.effect);

        this.effect.clear();

        const nested = proxy.inner;
        const nestedValue = proxy.inner.value;

        expect(this.effect.getTrackCount()).toBeGreaterThan(0);
    }

    @After()
    async clean() {
    }
}



@Suite('Reactive Utils Tests')
export class ReactiveUtilsTest {

    @Test('isReactive should return truthy for reactive object')
    testIsReactiveTrue() {
        const effect = new TestEffect();
        const obj: any = { value: 1 };
        const proxy: any = reactive(obj, effect);

        expect(isReactive(proxy)).toBeTruthy();
        expect(isReactive(obj)).toBeTruthy();
    }

    @Test('isReactive should return falsy for non-reactive objects')
    testIsReactiveFalse() {
        expect(isReactive({})).toBeFalsy();
        expect(isReactive(null)).toBeFalsy();
        expect(isReactive(123)).toBeFalsy();
        expect(isReactive('string')).toBeFalsy();
        expect(isReactive(true)).toBeFalsy();
    }

    @Test('canReactive should return true for plain objects')
    testCanReactiveTrue() {
        expect(canReactive({})).toBe(true);
        expect(canReactive({ a: 1 })).toBe(true);
        expect(canReactive([])).toBe(true);
    }

    @Test('canReactive should return false for non-reactive types')
    testCanReactiveFalse() {
        expect(canReactive(null)).toBe(false);
        expect(canReactive(undefined)).toBe(false);
        expect(canReactive(123)).toBe(false);
        expect(canReactive('string')).toBe(false);
        expect(canReactive(true)).toBe(false);
    }

    @Test('canReactive should return false for native types')
    testCanReactiveNativeTypes() {
        expect(canReactive(new Date())).toBe(false);
        expect(canReactive(new Map())).toBe(false);
        expect(canReactive(new Set())).toBe(false);
        expect(canReactive(new WeakMap())).toBe(false);
        expect(canReactive(new WeakSet())).toBe(false);
    }

    @Test('canReactive should return false for objects with noReact symbol')
    testCanReactiveNoReact() {
        const obj: any = { value: 1 };
        obj[noReact] = true;

        expect(canReactive(obj)).toBe(false);
    }

    @Test('noReact should be a symbol')
    testNoReactIsSymbol() {
        expect(typeof noReact).toBe('symbol');
    }

    @Test('reactive should return same object for non-reactive targets')
    testReactiveNonReactive() {
        const effect = new TestEffect();

        expect(reactive(null, effect)).toBeNull();
        expect(reactive(new Date(), effect)).toBeInstanceOf(Date);
        expect(reactive(123, effect)).toBe(123);
        expect(reactive('test', effect)).toBe('test');
    }

    @After()
    async clean() {
    }
}



@Suite('Reactive Edge Cases Tests')
export class ReactiveEdgeCaseTest {

    effect!: TestEffect;

    @Before()
    async init() {
        this.effect = new TestEffect();
    }

    @Test('should handle empty object')
    testEmptyObject() {
        const obj = {};
        const proxy = reactive(obj, this.effect);

        expect(Object.keys(proxy).length).toBe(0);
    }

    @Test('should handle object with function properties')
    testObjectWithFunctions() {
        const obj = {
            value: 1,
            increment() {
                this.value++;
            }
        };
        const proxy = reactive(obj, this.effect);

        proxy.increment();

        expect(proxy.value).toBe(2);
        expect(this.effect.getTriggerCount()).toBe(1);
    }

    @Test('should handle array in reactive object')
    testArrayInReactive() {
        const obj = { items: [1, 2, 3] };
        const proxy = reactive(obj, this.effect);

        proxy.items.push(4);

        expect(proxy.items.length).toBe(4);
    }

    @Test('should handle nested reactive objects')
    testNestedReactiveObjects() {
        const inner = { value: 1 };
        const outer = { inner: inner };
        const proxy = reactive(outer, this.effect);

        expect(isReactive(proxy.inner)).toBe(true);
    }

    @Test('should handle setting undefined value')
    testSetUndefined() {
        const obj = { a: 1 };
        const proxy = reactive(obj, this.effect);

        this.effect.clear();

        proxy.a = undefined;

        expect(proxy.a).toBeUndefined();
        expect(this.effect.getTriggerCount()).toBe(1);
    }

    @Test('should handle setting null value')
    testSetNull() {
        const obj = { a: 1 };
        const proxy = reactive(obj, this.effect);

        this.effect.clear();

        proxy.a = null;

        expect(proxy.a).toBeNull();
        expect(this.effect.getTriggerCount()).toBe(1);
    }

    @Test('should handle object with symbol keys')
    testSymbolKeys() {
        const sym = Symbol('test');
        const obj = { [sym]: 'value' };
        const proxy = reactive(obj, this.effect);

        expect(proxy[sym]).toBe('value');
    }

    @Test('should handle numeric keys')
    testNumericKeys() {
        const obj: any = { 0: 'first', 1: 'second' };
        const proxy = reactive(obj, this.effect);

        expect(proxy[0]).toBe('first');
        expect(proxy[1]).toBe('second');
    }

    @Test('should track method calls')
    testTrackMethodCalls() {
        const obj = {
            value: 1,
            getValue() {
                return this.value;
            }
        };
        const proxy = reactive(obj, this.effect);

        proxy.getValue();

        expect(this.effect.getTrackCount()).toBeGreaterThan(0);
    }

    @Test('should handle in operator with reactive')
    testInOperator() {
        const obj = { existing: 1 };
        const proxy = reactive(obj, this.effect);

        expect('existing' in proxy).toBe(true);
        expect('nonExisting' in proxy).toBe(false);
    }

    @After()
    async clean() {
    }
}



@Suite('Reactive Effect Tests')
export class ReactiveEffectTest {

    @Test('ReactiveEffect should track dependencies')
    testEffectTracking() {
        const effect = new TestEffect();
        const obj = { a: 1, b: 2 };
        const proxy = reactive(obj, effect);

        const _ = proxy.a;
        const __ = proxy.b;

        expect(effect.getTrackCount()).toBeGreaterThanOrEqual(2);
    }

    @Test('ReactiveEffect should trigger on changes')
    testEffectTriggering() {
        const effect = new TestEffect();
        const obj = { value: 1 };
        const proxy = reactive(obj, effect);

        proxy.value = 2;

        expect(effect.getTriggerCount()).toBe(1);
    }

    @Test('ReactiveEffect should stop properly')
    testEffectStop() {
        const effect = new TestEffect();
        expect(effect.active).toBe(true);

        effect.stop();

        expect(effect.active).toBe(false);
    }

    @Test('ReactiveEffect should clear tracking data')
    testEffectClear() {
        const effect = new TestEffect();
        const obj = { a: 1 };
        const proxy = reactive(obj, effect);

        effect.clear();
        proxy.a = 2;

        expect(effect.getTrackCount()).toBe(0);
        expect(effect.getTriggerCount()).toBe(1);
    }

    @Test('ReactiveEffect should track nested access')
    testEffectNestedAccess() {
        const effect = new TestEffect();
        const obj = { nested: { value: 42 } };
        const proxy = reactive(obj, effect);

        const nested = proxy.nested;
        const value = nested.value;

        expect(effect.getTrackCount()).toBeGreaterThan(0);
    }

    @After()
    async clean() {
    }
}
