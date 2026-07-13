import expect = require('expect');
import { Application } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { ComponentRef } from '../src/refs/component';
import { Component, ComponentsModule } from '../src';
import { XmlTemplateModule } from '../xml/src';

@Component({
    selector: 'lifecycle-render-probe',
    template: `<section><p>{{label}}</p></section>`
})
class LifecycleRenderProbeComponent {
    label = 'ready';
    initCount = 0;
    afterViewInitCount = 0;

    onInit(): void {
        this.initCount += 1;
    }

    onAfterViewInit(): void {
        this.afterViewInitCount += 1;
    }
}

@Suite('component render lifecycle')
export class ComponentRenderLifecycleTest {
    @Test('calls init hooks once even when component renders again')
    async callsLifecycleHooksOnce() {
        const ctx = await Application.run(LifecycleRenderProbeComponent, {
            deps: [XmlTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(LifecycleRenderProbeComponent) as ComponentRef<LifecycleRenderProbeComponent>;
            expect(ref.instance.initCount).toEqual(1);
            expect(ref.instance.afterViewInitCount).toEqual(1);

            ref.instance.label = 'updated';
            await ref.render();

            expect(ref.instance.initCount).toEqual(1);
            expect(ref.instance.afterViewInitCount).toEqual(1);
        } finally {
            await ctx.close();
        }
    }
}
