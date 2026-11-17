import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule, TemplateRef, ViewChild, ViewContainerRef } from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'vcr-container-test',
    template: `<div>
        <v-template #tpl><span class="item">{{label}}</span></v-template>
        <span #anchor></span>
    </div>`
})
class VcrContainerComponent {
    @ViewChild('tpl') tpl?: TemplateRef<any>;
    @ViewChild('anchor', ViewContainerRef) vcr?: ViewContainerRef;
}

@Suite('view container ref')
export class ViewContainerRefTest {
    @Test('inserts, moves and removes views with a stable index')
    async moveAndRemove() {
        const ctx = await Application.run(VcrContainerComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(VcrContainerComponent) as any;
            const component = ref.instance as VcrContainerComponent;
            const root = ref.hostView.rootNodes[0] as any;
            const labels = () => (root.querySelectorAll('.item') || []).map((node: any) => node.textContent);
            const vcr = component.vcr!;
            const tpl = component.tpl!;

            const a = vcr.createEmbeddedView(tpl, { label: 'A' } as any);
            const b = vcr.createEmbeddedView(tpl, { label: 'B' } as any);
            const c = vcr.createEmbeddedView(tpl, { label: 'C' } as any);

            expect(vcr.length).toBe(3);
            expect(labels()).toEqual(['A', 'B', 'C']);
            expect(vcr.indexOf(a)).toBe(0);
            expect(vcr.indexOf(b)).toBe(1);
            expect(vcr.indexOf(c)).toBe(2);

            vcr.move(c, 0);
            expect(labels()).toEqual(['C', 'A', 'B']);
            expect(vcr.indexOf(c)).toBe(0);
            expect(vcr.indexOf(a)).toBe(1);

            vcr.move(c, 2);
            expect(labels()).toEqual(['A', 'B', 'C']);
            expect(vcr.indexOf(c)).toBe(2);

            vcr.remove(1);
            expect(labels()).toEqual(['A', 'C']);
            expect(vcr.indexOf(b)).toBe(-1);
            expect(vcr.length).toBe(2);

            vcr.clear();
            expect(vcr.length).toBe(0);
            expect(labels()).toEqual([]);
        } finally {
            await ctx.close();
        }
    }
}
