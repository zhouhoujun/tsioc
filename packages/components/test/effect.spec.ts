import expect = require('expect');
import { ReactiveEffect, noReact } from '../src/effect';

describe('ReactiveEffect', () => {
    
    describe('abstract class', () => {
        it('should define track method', () => {
            class TestEffect extends ReactiveEffect {
                track(target: object, key: string | symbol): void {}
                trigger(target: object, key: string | symbol, newValue?: any, oldValue?: any): void {}
                run<T>(fn: () => T): T { return fn(); }
                stop(): void {}
                get active(): boolean { return true; }
            }
            
            const effect = new TestEffect();
            expect(typeof effect.track).toBe('function');
        });

        it('should define trigger method', () => {
            class TestEffect extends ReactiveEffect {
                track(target: object, key: string | symbol): void {}
                trigger(target: object, key: string | symbol, newValue?: any, oldValue?: any): void {}
                run<T>(fn: () => T): T { return fn(); }
                stop(): void {}
                get active(): boolean { return true; }
            }
            
            const effect = new TestEffect();
            expect(typeof effect.trigger).toBe('function');
        });

        it('should define run method', () => {
            class TestEffect extends ReactiveEffect {
                track(target: object, key: string | symbol): void {}
                trigger(target: object, key: string | symbol, newValue?: any, oldValue?: any): void {}
                run<T>(fn: () => T): T { return fn(); }
                stop(): void {}
                get active(): boolean { return true; }
            }
            
            const effect = new TestEffect();
            expect(typeof effect.run).toBe('function');
        });

        it('should define stop method', () => {
            class TestEffect extends ReactiveEffect {
                track(target: object, key: string | symbol): void {}
                trigger(target: object, key: string | symbol, newValue?: any, oldValue?: any): void {}
                run<T>(fn: () => T): T { return fn(); }
                stop(): void {}
                get active(): boolean { return true; }
            }
            
            const effect = new TestEffect();
            expect(typeof effect.stop).toBe('function');
        });

        it('should define active getter', () => {
            class TestEffect extends ReactiveEffect {
                private _active = true;
                track(target: object, key: string | symbol): void {}
                trigger(target: object, key: string | symbol, newValue?: any, oldValue?: any): void {}
                run<T>(fn: () => T): T { return fn(); }
                stop(): void { this._active = false; }
                get active(): boolean { return this._active; }
            }
            
            const effect = new TestEffect();
            expect(effect.active).toBeTruthy();
            effect.stop();
            expect(effect.active).toBeFalsy();
        });

        it('should mark with noReact symbol', () => {
            class TestEffect extends ReactiveEffect {
                track(target: object, key: string | symbol): void {}
                trigger(target: object, key: string | symbol, newValue?: any, oldValue?: any): void {}
                run<T>(fn: () => T): T { return fn(); }
                stop(): void {}
                get active(): boolean { return true; }
            }
            
            const effect = new TestEffect();
            expect((effect as any)[noReact]).toBeTruthy();
        });
    });

    describe('noReact symbol', () => {
        it('should be a symbol', () => {
            expect(typeof noReact).toBe('symbol');
        });
    });
});