import expect = require('expect');
import { OnDestroy, DestroyCallback, Destroyable } from '../src/destroy';

describe('Destroy Types', () => {

    describe('OnDestroy interface', () => {
        it('should implement onDestroy method', () => {
            const obj: OnDestroy = {
                onDestroy: () => {}
            };
            expect(typeof obj.onDestroy).toBe('function');
        });
    });

    describe('DestroyCallback type', () => {
        it('should accept function', () => {
            const callback: DestroyCallback = () => {};
            expect(typeof callback).toBe('function');
        });

        it('should accept OnDestroy object', () => {
            const callback: DestroyCallback = {
                onDestroy: () => {}
            };
            expect(typeof (callback as OnDestroy).onDestroy).toBe('function');
        });
    });

    describe('Destroyable interface', () => {
        it('should implement all methods', () => {
            const destroyable: Destroyable = {
                destroy: () => {},
                destroyed: false,
                onDestroy: (callback: DestroyCallback) => {}
            };
            expect(typeof destroyable.destroy).toBe('function');
            expect(destroyable.destroyed).toBe(false);
            expect(typeof destroyable.onDestroy).toBe('function');
        });

        it('should support optional offDestroy', () => {
            const destroyable: Destroyable = {
                destroy: () => {},
                onDestroy: (callback: DestroyCallback) => {},
                offDestroy: (callback: DestroyCallback) => {}
            };
            expect(typeof destroyable.offDestroy).toBe('function');
        });

        it('should implement destroy pattern', () => {
            let destroyed = false;
            const callbacks: DestroyCallback[] = [];
            
            const destroyable: Destroyable = {
                destroy() {
                    callbacks.forEach(cb => {
                        if (typeof cb === 'function') {
                            cb();
                        } else {
                            cb.onDestroy();
                        }
                    });
                    destroyed = true;
                },
                get destroyed() { return destroyed; },
                onDestroy(callback: DestroyCallback) {
                    callbacks.push(callback);
                }
            };
            
            let called = false;
            destroyable.onDestroy(() => { called = true; });
            destroyable.destroy();
            
            expect(destroyed).toBeTruthy();
            expect(called).toBeTruthy();
        });
    });
});