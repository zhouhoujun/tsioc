import expect = require('expect');
import { isReactive, canReactive, reactive } from '../src/reactive';
import { ReactiveEffect, noReact } from '../src/effect';

class MockEffect extends ReactiveEffect<void> {
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
}

describe('Reactive', () => {

    describe('isReactive', () => {
        it('should return false for plain object', () => {
            expect(isReactive({})).toBeFalsy();
        });

        it('should return false for object inheriting reactive flag from prototype', () => {
            const parent = reactive({ value: 1 }, new MockEffect());
            const child = Object.create(parent);
            child.value = 2;

            expect(isReactive(child)).toBeFalsy();
        });

        it('should return false for null', () => {
            expect(isReactive(null)).toBeFalsy();
        });

        it('should return false for primitive', () => {
            expect(isReactive(123)).toBeFalsy();
            expect(isReactive('string')).toBeFalsy();
        });
    });

    describe('canReactive', () => {
        it('should return true for plain object', () => {
            expect(canReactive({})).toBeTruthy();
        });

        it('should return false for null', () => {
            expect(canReactive(null)).toBeFalsy();
        });

        it('should return false for undefined', () => {
            expect(canReactive(undefined)).toBeFalsy();
        });

        it('should return false for primitive', () => {
            expect(canReactive(123)).toBeFalsy();
            expect(canReactive('string')).toBeFalsy();
        });

        it('should return false for Date', () => {
            expect(canReactive(new Date())).toBeFalsy();
        });

        it('should return false for Map', () => {
            expect(canReactive(new Map())).toBeFalsy();
        });

        it('should return false for Set', () => {
            expect(canReactive(new Set())).toBeFalsy();
        });

        it('should return false for objects marked noReact', () => {
            const obj: any = { [noReact]: true };
            expect(canReactive(obj)).toBeFalsy();
        });
    });

    describe('reactive', () => {
        let effect: MockEffect;

        beforeEach(() => {
            effect = new MockEffect();
        });

        it('should return same object for non-reactive targets', () => {
            const date = new Date();
            expect(reactive(date, effect)).toBe(date);
        });

        it('should return null for null', () => {
            expect(reactive(null, effect)).toBeNull();
        });

        it('should create proxy for plain object', () => {
            const obj = { a: 1 };
            const proxy = reactive(obj, effect);
            expect(proxy).not.toBe(obj);
            expect(isReactive(proxy)).toBeTruthy();
        });

        it('should create a fresh proxy for child scope inheriting from reactive parent', () => {
            const parent = reactive({ title: 'Console' }, effect);
            const child = Object.create(parent);
            child.item = { label: 'One' };

            const childEffect = new MockEffect();
            const proxy = reactive(child, childEffect);

            expect(proxy).not.toBe(child);
            expect(isReactive(proxy)).toBeTruthy();

            proxy.item = { label: 'Two' };
            expect(childEffect.getTriggerCount()).toBe(1);
            expect(proxy.item.label).toBe('Two');
            expect(proxy.title).toBe('Console');
        });

        it('should track property access', () => {
            const obj = { a: 1, b: 2 };
            const proxy = reactive(obj, effect);
            
            const value = proxy.a;
            
            expect(effect.getTrackCount()).toBe(1);
            expect(value).toBe(1);
        });

        it('should trigger on property set', () => {
            const obj = { a: 1 };
            const proxy = reactive(obj, effect);
            
            proxy.a = 2;
            
            expect(effect.getTriggerCount()).toBe(1);
            expect(proxy.a).toBe(2);
        });

        it('should not trigger when setting same value', () => {
            const obj = { a: 1 };
            const proxy = reactive(obj, effect);
            
            proxy.a = 1;
            
            expect(effect.getTriggerCount()).toBe(0);
        });

        it('should trigger on property delete', () => {
            const obj = { a: 1 };
            const proxy = reactive(obj, effect);
            
            delete proxy.a;
            
            expect(effect.getTriggerCount()).toBe(1);
        });

        it('should track nested object access', () => {
            const obj = { nested: { value: 1 } };
            const proxy = reactive(obj, effect);
            
            const nested = proxy.nested;
            const value = nested.value;
            
            expect(effect.getTrackCount()).toBeGreaterThan(0);
        });

        it('should handle has operator', () => {
            const obj = { a: 1 };
            const proxy = reactive(obj, effect);
            
            expect('a' in proxy).toBeTruthy();
            expect('b' in proxy).toBeFalsy();
        });

        it('should handle ownKeys', () => {
            const obj = { a: 1, b: 2 };
            const proxy = reactive(obj, effect);
            
            const keys = Object.keys(proxy);
            expect(keys).toEqual(['a', 'b']);
        });
    });

    describe('noReact symbol', () => {
        it('should be a symbol', () => {
            expect(typeof noReact).toBe('symbol');
        });
    });
});
