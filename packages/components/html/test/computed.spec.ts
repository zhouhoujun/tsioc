import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, isReactive, canReactive, reactive, noReact, ReactiveEffect } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { FieldComponet } from './app';
import { HtmlTemplateModule } from '../src';

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

    clear() {
        this.tracks = [];
        this.triggers = [];
    }
}

@Suite('HTML Computed Properties Test')
export class ComputedTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(FieldComponet, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
            ]
        });
    }

    @Test('should test computed properties in FieldComponet')
    async testComputedProperties() {
        const fieldRef = this.ctx.runners.getRef(FieldComponet) as ComponentRef<FieldComponet>;
        const fieldComponent = fieldRef.instance;

        expect(fieldComponent).toBeDefined();
        expect(fieldComponent.fullName).toEqual('zhangsan (admin)');
        expect(fieldComponent.fullName1).toEqual('zhangsan admin');

        const fullName1 = fieldComponent.fullName;
        const fullName2 = fieldComponent.fullName;
        expect(fullName1).toBe(fullName2);

        fieldComponent.user = 'lisi';
        expect(fieldComponent.fullName).toEqual('lisi (admin)');
    }

    @Test('should update computed when dependency changes')
    async testComputedDependencyChange() {
        const fieldRef = this.ctx.runners.getRef(FieldComponet) as ComponentRef<FieldComponet>;
        const fieldComponent = fieldRef.instance;

        const currentFullName = fieldComponent.fullName;
        expect(currentFullName).toBeDefined();

        fieldComponent.role = 'user';
        expect(fieldComponent.fullName).toContain('user');

        fieldComponent.user = 'testuser';
        fieldComponent.role = 'testrole';
        expect(fieldComponent.fullName).toEqual('testuser (testrole)');
    }

    @Test('should test computed with cache')
    async testComputedCache() {
        const fieldRef = this.ctx.runners.getRef(FieldComponet) as ComponentRef<FieldComponet>;
        const fieldComponent = fieldRef.instance;

        const fullName1First = fieldComponent.fullName;
        const fullName1Second = fieldComponent.fullName;
        expect(fullName1First).toBe(fullName1Second);

        const fullName2First = fieldComponent.fullName1;
        const fullName2Second = fieldComponent.fullName1;
        expect(fullName2First).toBe(fullName2Second);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}



@Suite('HTML Reactive Utils Tests')
export class HtmlReactiveUtilsTest {

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



@Suite('HTML Reactive Effect Tests')
export class HtmlReactiveEffectTest {

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

    @After()
    async clean() {
    }
}
