import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import {
    Attribute, Component, ComponentsModule, ElementRef, QueryList, ViewChildren, ViewChild, ViewContainerRef
} from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'query-child',
    template: `<span class="child">{{label}}</span><span #inner></span><template v-if="enabled"><span #innerIf></span></template><template v-for="tag in tags"><span #tag>{{tag}}</span></template>`
})
class QueryChild {
    @Attribute() label = '';
    enabled = true;
    tags = ['x', 'y'];
    @ViewChild('inner') inner?: ElementRef;
    @ViewChild('innerIf') innerIf?: ElementRef;
    @ViewChildren('tag') tagList?: QueryList<ElementRef>;
}

@Component({
    selector: 'query-parent',
    imports: [QueryChild],
    template: `<div>
        <query-child #dup :label="'A'"></query-child>
        <query-child #dup :label="'B'"></query-child>
        <template v-if="show"><query-child #panel :label="'P'"></query-child></template>
        <template v-for="item in items"><query-child #row :label="item"></query-child></template>
        <span #containerRef></span>
    </div>`
})
class QueryParent {
    @ViewChild('dup') dup?: QueryChild;
    @ViewChild('panel') panel?: QueryChild;
    @ViewChild('row') row?: QueryChild;
    @ViewChild(QueryChild) first?: QueryChild;
    @ViewChild('query-child') byTag?: QueryChild;
    @ViewChild('containerRef', ViewContainerRef) container?: ViewContainerRef;
    @ViewChildren('dup') dups?: QueryList<QueryChild>;
    @ViewChildren('row') rows?: QueryList<QueryChild>;
    @ViewChildren(QueryChild) allChildren?: QueryList<QueryChild>;
    @ViewChild('inner') leakedInner?: ElementRef;
    @ViewChild('innerIf') leakedInnerIf?: ElementRef;
    @ViewChild('tag') leakedTag?: ElementRef;
    show = false;
    items = ['a', 'b'];
}

const settle = () => Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());

@Suite('view child queries')
export class ViewChildQueryTest {
    @Test('resolves duplicate refs, embedded views and dynamic updates')
    async dynamicQueries() {
        const ctx = await Application.run(QueryParent, { deps: [ConsoleTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.runners.getRef(QueryParent) as any;
            const parent = ref.instance as QueryParent;
            await settle();

            expect(parent.dup?.label).toBe('A');
            expect(parent.first?.label).toBe('A');
            expect(parent.byTag?.label).toBe('A');
            expect(parent.dups?.toArray().map(item => item.label)).toEqual(['A', 'B']);
            expect(parent.rows?.toArray().map(item => item.label)).toEqual(['a', 'b']);
            expect(typeof (parent.container as any)?.get).toBe('function');
            expect(parent.leakedInner).toBeUndefined();
            expect(parent.leakedInnerIf).toBeUndefined();
            expect(parent.first?.inner).toBeTruthy();
            expect(parent.first?.innerIf).toBeTruthy();
            expect(parent.first?.tagList?.length).toBe(2);
            expect(parent.leakedTag).toBeUndefined();

            let rowChanges = 0;
            parent.rows?.changes.subscribe(() => { rowChanges += 1; });

            parent.show = true;
            await settle();
            expect(parent.panel?.label).toBe('P');

            parent.items = ['a', 'b', 'c'];
            await settle();
            expect(parent.rows?.toArray().map(item => item.label)).toEqual(['a', 'b', 'c']);
            expect(rowChanges).toBeGreaterThan(0);

            parent.items = ['b', 'c'];
            await settle();
            expect(parent.rows?.toArray().map(item => item.label)).toEqual(['b', 'c']);
            expect(parent.row?.label).toBe('b');

            parent.show = false;
            await settle();
            expect(parent.panel).toBeUndefined();
        } finally {
            await ctx.close();
        }
    }

    @Test('completes ViewChildren QueryList on component destroy')
    async completesOnDestroy() {
        const ctx = await Application.run(QueryParent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        const ref = ctx.runners.getRef(QueryParent) as any;
        const parent = ref.instance as QueryParent;
        await settle();
        let completed = 0;
        parent.rows?.changes.subscribe({ complete: () => { completed += 1; } });
        await ctx.close();
        expect(completed).toBe(1);
    }
}
