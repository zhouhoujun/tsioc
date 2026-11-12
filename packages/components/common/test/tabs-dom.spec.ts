import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TabBarSource } from '../tab-bar';
import { TabsComponent, TabsModule } from '../tabs';

@Component({
    selector: 'tabs-host',
    imports: [TabsComponent],
    template: `
    <tabs :source="source">
        <tab-pane data-tab-id="a">Alpha pane</tab-pane>
        <tab-pane data-tab-id="b">Beta pane</tab-pane>
    </tabs>`
})
class TabsHostComponent {
    source: TabBarSource = {
        visible: true,
        items: [
            { id: 'a', label: 'Alpha', active: true },
            { id: 'b', label: 'Beta', active: false }
        ],
        select() { }
    };
}

@Suite('common tabs DOM panes')
export class TabsDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TabsHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, TabsModule],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                    }
                }
            ]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    @Test('keeps both panes mounted and hides only the inactive one')
    async hidesInactivePaneWithoutDestroyingIt() {
        const ref = this.ctx.get(ComponentFactory).create(TabsHostComponent, { injector: this.ctx }) as ComponentRef<TabsHostComponent>;
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const tabs = ref.hostView.query(TabsComponent) as ComponentRef<TabsComponent>;
        expect(tabs).toBeTruthy();
        const panes = Array.from(root.querySelectorAll('[data-tab-id]')) as any[];
        expect(panes.map(pane => pane.getAttribute('data-tab-id'))).toEqual(['a', 'b']);
        const alpha = panes[0];
        const beta = panes[1];
        expect(alpha.style.display).toEqual('');
        expect(beta.style.display).toEqual('none');

        tabs.instance.activate('b');
        await Promise.resolve();
        await Promise.resolve();
        expect(alpha.style.display).toEqual('none');
        expect(beta.style.display).toEqual('');
        // Hide/show only: the same nodes stay mounted.
        const after = Array.from(root.querySelectorAll('[data-tab-id]')) as any[];
        expect(after[0]).toBe(alpha);
        expect(after[1]).toBe(beta);
        expect(alpha.textContent).toContain('Alpha pane');
        expect(beta.textContent).toContain('Beta pane');
    }
}
