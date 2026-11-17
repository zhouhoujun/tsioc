import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import {
    Attribute, Component, ComponentsModule, ElementRef, QueryList, TemplateRef, ViewChild, ViewChildren, ViewContainerRef
} from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'vcr-container-test',
    template: `<div>
        <v-template #tpl><span class="item" #dynItem>{{label}}</span></v-template>
        <span #anchor></span>
    </div>`
})
class VcrContainerComponent {
    @ViewChild('tpl') tpl?: TemplateRef<any>;
    @ViewChild('anchor', ViewContainerRef) vcr?: ViewContainerRef;
    @ViewChild('dynItem', ElementRef) firstItem?: ElementRef;
    @ViewChildren('dynItem', ElementRef) itemList?: QueryList<ElementRef>;
}

@Component({
    selector: 'dynamic-child',
    template: `<span class="dynamic">{{label}}</span>`
})
class DynamicChild {
    @Attribute() label = '';
}

@Component({
    selector: 'dynamic-container-test',
    imports: [DynamicChild],
    template: `<div><span #anchor></span></div>`
})
class DynamicContainerComponent {
    @ViewChild('anchor', ViewContainerRef) vcr?: ViewContainerRef;
    @ViewChild(DynamicChild) first?: DynamicChild;
    @ViewChild('dyn', DynamicChild) refChild?: DynamicChild;
    @ViewChildren(DynamicChild) children?: QueryList<DynamicChild>;
    @ViewChildren('dyn') refChildren?: QueryList<DynamicChild>;
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
            const queryLabels = () => component.itemList?.toArray().map(item => item?.nativeElement?.textContent);
            const vcr = component.vcr!;
            const tpl = component.tpl!;

            const a = vcr.createEmbeddedView(tpl, { label: 'A' } as any);
            const b = vcr.createEmbeddedView(tpl, { label: 'B' } as any);
            const c = vcr.createEmbeddedView(tpl, { label: 'C' } as any);

            await Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());
            expect(vcr.length).toBe(3);
            expect(labels()).toEqual(['A', 'B', 'C']);
            expect(component.firstItem).toBeTruthy();
            expect(component.itemList?.length).toBe(3);
            expect(vcr.indexOf(a)).toBe(0);
            expect(vcr.indexOf(b)).toBe(1);
            expect(vcr.indexOf(c)).toBe(2);

            vcr.move(c, 0);
            await Promise.resolve().then(() => Promise.resolve());
            expect(labels()).toEqual(['C', 'A', 'B']);
            expect(queryLabels()).toEqual(['C', 'A', 'B']);
            expect(vcr.indexOf(c)).toBe(0);
            expect(vcr.indexOf(a)).toBe(1);

            vcr.move(c, 2);
            await Promise.resolve().then(() => Promise.resolve());
            expect(labels()).toEqual(['A', 'B', 'C']);
            expect(queryLabels()).toEqual(['A', 'B', 'C']);
            expect(vcr.indexOf(c)).toBe(2);

            vcr.remove(1);
            await Promise.resolve().then(() => Promise.resolve());
            expect(labels()).toEqual(['A', 'C']);
            expect(queryLabels()).toEqual(['A', 'C']);
            expect(vcr.indexOf(b)).toBe(-1);
            expect(vcr.length).toBe(2);

            const detached = vcr.detach(0);
            expect(detached).toBe(a);
            expect(labels()).toEqual(['C']);
            expect(vcr.length).toBe(1);

            vcr.reattach(detached!, 0);
            expect(labels()).toEqual(['A', 'C']);
            expect(vcr.indexOf(a)).toBe(0);
            expect((vcr.getHostElement(0) as any)?.tagName).toBe('span');

            vcr.clear();
            await Promise.resolve().then(() => Promise.resolve());
            expect(vcr.length).toBe(0);
            expect(component.firstItem).toBeUndefined();
            expect(component.itemList?.length ?? 0).toBe(0);
            expect(labels()).toEqual([]);
        } finally {
            await ctx.close();
        }
    }

    @Test('refreshes view queries after createComponent and remove')
    async dynamicComponentQueries() {
        const ctx = await Application.run(DynamicContainerComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(DynamicContainerComponent) as any;
            const component = ref.instance as DynamicContainerComponent;
            component.vcr!.createComponent(DynamicChild, { ref: 'dyn', inputs: { label: 'D' } as any });
            await Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

            expect(component.first?.label).toBe('D');
            expect(component.refChild?.label).toBe('D');
            expect(component.children?.toArray().map(item => item.label)).toEqual(['D']);
            expect(component.refChildren?.toArray().map(item => item.label)).toEqual(['D']);

            const detached = component.vcr!.detach(0);
            await Promise.resolve().then(() => Promise.resolve());
            expect(component.first).toBeUndefined();
            expect(component.refChild).toBeUndefined();
            expect(component.children?.length ?? 0).toBe(0);
            expect(component.refChildren?.length ?? 0).toBe(0);

            component.vcr!.reattach(detached!);
            await Promise.resolve().then(() => Promise.resolve());
            expect(component.first?.label).toBe('D');
            expect(component.refChild?.label).toBe('D');
            expect(component.refChildren?.toArray().map(item => item.label)).toEqual(['D']);

            component.vcr!.remove(0);
            await Promise.resolve().then(() => Promise.resolve());
            expect(component.first).toBeUndefined();
            expect(component.refChild).toBeUndefined();
            expect(component.children?.length ?? 0).toBe(0);
            expect(component.refChildren?.length ?? 0).toBe(0);
        } finally {
            await ctx.close();
        }
    }
}
