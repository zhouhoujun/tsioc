import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule, REACTIVE_EFFECT_OPTIONS, ReactiveEffect, reactive } from '../src';
import { DefaultReactiveEffect } from '../src/impl/effect';
import { XmlTemplateModule } from '../xml/src';

@Component({
    selector: 'scheduled-comp',
    template: `<div>{{value}}</div>`
})
class ScheduledComponent {
    value = 1;
}

@Suite('reactive effect scheduling')
export class EffectSchedulingTest {
    @Test('microtask mode coalesces writes into one pass')
    async coalescesMicrotaskWrites() {
        const effect = new DefaultReactiveEffect({ schedule: 'microtask' });
        const state: any = reactive({ a: 0, b: 0 }, effect);
        let runs = 0;
        let seen: number[] = [];

        effect.run(() => {
            seen = [state.a, state.b];
            runs += 1;
        });
        expect(runs).toBe(1);

        state.a = 1;
        state.b = 2;

        // State is updated immediately; dependents wait for the microtask.
        expect(state.a).toBe(1);
        expect(runs).toBe(1);

        await Promise.resolve();
        expect(runs).toBe(2);
        expect(seen).toEqual([1, 2]);
    }

    @Test('sync remains the default')
    syncByDefault() {
        const effect = new DefaultReactiveEffect();
        const state: any = reactive({ a: 0 }, effect);
        let runs = 0;
        effect.run(() => {
            void state.a;
            runs += 1;
        });
        state.a = 1;
        expect(runs).toBe(2);
    }

    @Test('application effect can opt into microtask scheduling')
    async applicationOptIn() {
        const ctx = await Application.run(ScheduledComponent, {
            deps: [XmlTemplateModule, ComponentsModule],
            providers: [
                { provide: REACTIVE_EFFECT_OPTIONS, useValue: { schedule: 'microtask' } }
            ]
        });
        try {
            const effect = ctx.get(ReactiveEffect) as DefaultReactiveEffect;
            expect(effect.schedule).toBe('microtask');
        } finally {
            await ctx.close();
        }
    }
}
