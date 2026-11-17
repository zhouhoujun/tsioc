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
    template: `<div class="slot"></div>`
})
class ContentHost {
    @ContentChild('pc') item?: ProjectedItem;
    @ContentChildren(ProjectedItem) items?: QueryList<ProjectedItem>;
}

@Component({
    selector: 'content-parent',
    imports: [ContentHost, ProjectedItem],
    template: `<div>
        <content-host>
            <projected-item #pc label="P"></projected-item>
            <projected-item label="Q"></projected-item>
        </content-host>
    </div>`
})
class ContentParent {
    @ViewChild(ContentHost) host?: ContentHost;
    @ViewChild('pc') leaked?: ProjectedItem;
}

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
        } finally {
            await ctx.close();
        }
    }
}
