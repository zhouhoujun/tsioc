import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import {
    Attribute, Component, ComponentsModule, ContentChild, ContentChildren, QueryList, ViewChild
} from '../src';
import { ConsoleTemplateModule } from '../console/src';

@Component({
    selector: 'projected-item',
    template: `<span class="projected">{{label}}</span>`
})
class ProjectedItem {
    @Attribute() label = '';
}

@Component({
    selector: 'content-host',
    imports: [ProjectedItem],
    template: `<div class="slot"><v-content slot="header" class="header-slot"></v-content><v-content select=".body-item" class="body-slot"></v-content><v-content class="default-slot"></v-content></div>`
})
class ContentHost {
    @ContentChild('pc') item?: ProjectedItem;
    @ContentChild('dyn') dynamic?: ProjectedItem;
    @ContentChildren(ProjectedItem) items?: QueryList<ProjectedItem>;
}

@Component({
    selector: 'content-parent',
    imports: [ContentHost, ProjectedItem],
    template: `<div>
        <content-host>
            <projected-item #pc label="P" slot="header"></projected-item>
            <projected-item label="Q" class="body-item"></projected-item>
        </content-host>
    </div>`
})
class ContentParent {
    @ViewChild(ContentHost) host?: ContentHost;
    @ViewChild('pc') leaked?: ProjectedItem;
}

@Component({
    selector: 'content-dynamic-parent',
    imports: [ContentHost, ProjectedItem],
    template: `<div>
        <content-host>
            <div>
                <template v-if="show"><projected-item #dyn label="D"></projected-item></template>
            </div>
        </content-host>
    </div>`
})
class DynamicContentParent {
    @ViewChild(ContentHost) host?: ContentHost;
    show = false;
}

@Component({
    selector: 'content-initial-parent',
    imports: [ContentHost, ProjectedItem],
    template: `<div>
        <content-host>
            <div>
                <template v-if="show"><projected-item #dyn label="D"></projected-item></template>
            </div>
        </content-host>
    </div>`
})
class InitialContentParent {
    @ViewChild(ContentHost) host?: ContentHost;
    show = true;
}

@Component({
    selector: 'required-content-host',
    template: `<div></div>`
})
class RequiredContentHost {
    @ContentChild({ selector: 'missing', required: true }) missing?: ProjectedItem;
}

@Component({
    selector: 'required-content-parent',
    imports: [RequiredContentHost],
    template: `<div><required-content-host></required-content-host></div>`
})
class RequiredContentParent { }

@Suite('content child queries')
export class ContentChildQueryTest {
    @Test('resolves projected content without leaking into the parent view')
    async contentQueries() {
        const ctx = await Application.run(ContentParent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(ContentParent) as any;
            const parent = ref.instance as ContentParent;
            expect(parent.host).toBeDefined();
            expect(parent.host?.item).toBeInstanceOf(ProjectedItem);
            expect(parent.host?.item?.label).toBe('P');
            expect(parent.host?.items?.toArray().map(item => item.label)).toEqual(['P', 'Q']);
            expect(parent.leaked).toBeUndefined();
            const root = ref.hostView.rootNodes[0] as any;
            expect((root.querySelector('.header-slot') as any)?.querySelectorAll('.projected')[0]?.textContent).toBe('P');
            expect((root.querySelector('.body-slot') as any)?.querySelectorAll('.projected')[0]?.textContent).toBe('Q');
            expect((root.querySelector('.default-slot') as any)?.querySelectorAll?.('.projected')?.length || 0).toBe(0);
        } finally {
            await ctx.close();
        }
    }

    @Test('resolves content queries for initially visible projected structure')
    async initialContent() {
        const ctx = await Application.run(InitialContentParent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(InitialContentParent) as any;
            const parent = ref.instance as InitialContentParent;
            await Promise.resolve().then(() => Promise.resolve());
            expect(parent.host?.dynamic?.label).toBe('D');
            expect(parent.host?.items?.toArray().map(item => item.label)).toEqual(['D']);
            const root = ref.hostView.rootNodes[0] as any;
            expect((root.querySelector('.default-slot') as any)?.querySelectorAll('.projected')[0]?.textContent).toBe('D');
        } finally {
            await ctx.close();
        }
    }

    @Test('required content queries throw when missing')
    async requiredContent() {
        let error: any;
        try {
            const ctx = await Application.run(RequiredContentParent, {
                deps: [ConsoleTemplateModule, ComponentsModule]
            });
            await ctx.close();
        } catch (caught) {
            error = caught;
        }
        expect(String(error?.message || error)).toContain("ContentChild 'missing' not found");
    }

    @Test('updates content queries after projected structure changes')
    async dynamicContent() {
        const ctx = await Application.run(DynamicContentParent, {
            deps: [ConsoleTemplateModule, ComponentsModule]
        });
        try {
            const ref = ctx.runners.getRef(DynamicContentParent) as any;
            const parent = ref.instance as DynamicContentParent;
            await Promise.resolve();
            expect(parent.host?.dynamic).toBeUndefined();
            expect(parent.host?.items?.length ?? 0).toBe(0);

            parent.show = true;
            await Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());
            expect(parent.host?.dynamic?.label).toBe('D');
            expect(parent.host?.items?.toArray().map(item => item.label)).toEqual(['D']);
            const root = ref.hostView.rootNodes[0] as any;
            expect((root.querySelector('.default-slot') as any)?.querySelectorAll('.projected')[0]?.textContent).toBe('D');

            parent.show = false;
            await Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());
            expect(parent.host?.dynamic).toBeUndefined();
            expect(parent.host?.items?.length ?? 0).toBe(0);
        } finally {
            await ctx.close();
        }
    }
}