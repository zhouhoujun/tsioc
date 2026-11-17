import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentsModule } from '../src';
import { ConsoleTemplateModule } from '../console/src';

interface Row { label: string; }

@Component({
    selector: 'vfor-tail-comp',
    template: `<div><span class="row" v-for="item in items">{{$index}}/{{$count}}/{{$first}}/{{$last}}/{{item.label}}</span></div>`
})
class VForTailComponent {
    items: Row[] = [{ label: 'A' }, { label: 'B' }];
}

@Component({
    selector: 'vfor-keyed-comp',
    template: `<div><span class="keyed" v-for="item in items" trackBy="id">{{item.label}}</span></div>`
})
class VForKeyedComponent {
    items = [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' }
    ];
}

@Suite('v-for tail updates')
export class VForTailTest {
    private texts(root: any): string[] {
        return root.querySelectorAll('.row').map((node: any) => node.textContent);
    }

    @Test('append and remove from the tail keep $index/$count/$first/$last current')
    async appendAndRemoveTail() {
        const ctx = await Application.run(VForTailComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(VForTailComponent) as any;
            const component = ref.instance as VForTailComponent;
            const root = ref.hostView.rootNodes[0] as any;

            expect(this.texts(root)).toEqual(['0/2/true/false/A', '1/2/false/true/B']);

            component.items = [...component.items, { label: 'C' }];
            await Promise.resolve();
            expect(this.texts(root)).toEqual([
                '0/3/true/false/A',
                '1/3/false/false/B',
                '2/3/false/true/C'
            ]);

            component.items = component.items.slice(0, 2);
            await Promise.resolve();
            expect(this.texts(root)).toEqual(['0/2/true/false/A', '1/2/false/true/B']);
        } finally {
            await ctx.close();
        }
    }

    @Test('middle insertion shifts only the affected rows')
    async middleInsertion() {
        const ctx = await Application.run(VForTailComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(VForTailComponent) as any;
            const component = ref.instance as VForTailComponent;
            const root = ref.hostView.rootNodes[0] as any;

            component.items = [component.items[0], { label: 'X' }, component.items[1]];
            await Promise.resolve();
            expect(this.texts(root)).toEqual([
                '0/3/true/false/A',
                '1/3/false/false/X',
                '2/3/false/true/B'
            ]);
        } finally {
            await ctx.close();
        }
    }

    @Test('middle removal shifts the remaining rows back')
    async middleRemoval() {
        const ctx = await Application.run(VForTailComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(VForTailComponent) as any;
            const component = ref.instance as VForTailComponent;
            const root = ref.hostView.rootNodes[0] as any;

            component.items = [{ label: 'A' }, { label: 'X' }, { label: 'B' }];
            await Promise.resolve();
            component.items = [component.items[0], component.items[2]];
            await Promise.resolve();
            expect(this.texts(root)).toEqual(['0/2/true/false/A', '1/2/false/true/B']);
        } finally {
            await ctx.close();
        }
    }

    @Test('reordered items keep the new list order')
    async reorder() {
        const ctx = await Application.run(VForTailComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(VForTailComponent) as any;
            const component = ref.instance as VForTailComponent;
            const root = ref.hostView.rootNodes[0] as any;

            component.items = [{ label: 'A' }, { label: 'B' }, { label: 'C' }];
            await Promise.resolve();
            component.items = [component.items[2], component.items[0], component.items[1]];
            await Promise.resolve();
            expect(this.texts(root)).toEqual([
                '0/3/true/false/C',
                '1/3/false/false/A',
                '2/3/false/true/B'
            ]);
        } finally {
            await ctx.close();
        }
    }

    @Test('custom trackBy reorders views by identity')
    async keyedReorder() {
        const ctx = await Application.run(VForKeyedComponent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(VForKeyedComponent) as any;
            const component = ref.instance as VForKeyedComponent;
            const root = ref.hostView.rootNodes[0] as any;
            const labels = () => root.querySelectorAll('.keyed').map((node: any) => node.textContent);

            expect(labels()).toEqual(['A', 'B', 'C']);

            component.items = [component.items[2], component.items[0], component.items[1]];
            await Promise.resolve();
            expect(labels()).toEqual(['C', 'A', 'B']);

            component.items = [component.items[0], component.items[2]];
            await Promise.resolve();
            expect(labels()).toEqual(['C', 'B']);
        } finally {
            await ctx.close();
        }
    }
}
