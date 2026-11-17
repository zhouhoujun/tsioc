import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule, ElementRef, ViewChild } from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'static-query-parent',
    template: `<div><template v-if="show"><span #panel></span></template></div>`
})
class StaticQueryParent {
    @ViewChild({ selector: 'panel', static: true }) staticPanel?: ElementRef;
    @ViewChild('panel') dynamicPanel?: ElementRef;
    show = true;
}

@Component({
    selector: 'required-query-parent',
    template: `<div></div>`
})
class RequiredQueryParent {
    @ViewChild({ selector: 'missing', required: true }) missing?: ElementRef;
}

const settle = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

@Suite('view child options')
export class ViewChildOptionsTest {
    @Test('static query keeps its initial value while dynamic query clears')
    async staticAndDynamic() {
        const ctx = await Application.run(StaticQueryParent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(StaticQueryParent) as any;
            const parent = ref.instance as StaticQueryParent;
            await settle();
            expect(parent.staticPanel).toBeTruthy();
            expect(parent.dynamicPanel).toBeTruthy();

            parent.show = false;
            await settle();
            expect(parent.staticPanel).toBeTruthy();
            expect(parent.dynamicPanel).toBeUndefined();
        } finally {
            await ctx.close();
        }
    }

    @Test('required query throws when the selector is missing')
    async requiredMissing() {
        let error: any;
        try {
            const ctx = await Application.run(RequiredQueryParent, {
                deps: [ConsoleTemplateModule, ComponentsModule]
            });
            await ctx.close();
        } catch (caught) {
            error = caught;
        }
        expect(String(error?.message || error)).toContain("ViewChild 'missing' not found");
    }
}
