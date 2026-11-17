import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule, ReactiveEffect } from '../src';
import { XmlTemplateModule } from '../xml/src';

@Component({
    selector: 'lifecycle-comp',
    template: `<div></div>`
})
class LifecycleComponent { }

@Suite('component effect lifecycle')
export class EffectLifecycleTest {
    @Test('closing the application stops the reactive effect')
    async stopsEffectOnClose() {
        const ctx = await Application.run(LifecycleComponent, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
        const effect = ctx.get(ReactiveEffect);
        expect(effect.active).toBeTruthy();
        await ctx.close();
        expect(effect.active).toBeFalsy();
    }
}
