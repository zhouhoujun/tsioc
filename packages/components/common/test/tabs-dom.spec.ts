import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TabBarComponent, TabBarSource } from '../tab-bar';
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
    selected: string[] = [];
    source: TabBarSource = {
        visible: true,
        items: [
            { id: 'a', label: 'Alpha', active: true },
            { id: 'b', label: 'Beta', active: false }
        ],
        select: (id: string) => { this.selected.push(id); }
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
        expect(alpha.getAttribute('role')).toEqual('tabpanel');
        expect(alpha.getAttribute('aria-hidden')).toEqual('true');
        expect(alpha.getAttribute('tabindex')).toEqual('-1');
        expect(beta.getAttribute('aria-hidden')).toEqual('false');
        expect(beta.getAttribute('tabindex')).toEqual('0');
        const tabsBar = tabs.hostView.query(TabBarComponent) as ComponentRef<TabBarComponent>;
        const tabNodes = Array.from(root.querySelectorAll('.tab') as NodeListOf<HTMLElement>);
        const panelA = root.querySelector('[data-tab-id="a"]') as HTMLElement;
        const panelB = root.querySelector('[data-tab-id="b"]') as HTMLElement;
        expect(tabNodes[0].id).toEqual(panelA.getAttribute('aria-labelledby'));
        expect(tabNodes[1].id).toEqual(panelB.getAttribute('aria-labelledby'));
        expect(tabNodes[0].getAttribute('aria-controls')).toEqual(panelA.id);
        expect(tabNodes[1].getAttribute('aria-controls')).toEqual(panelB.id);
        expect(tabsBar.instance.closeTabLabel({ id: 'b', label: 'Beta' })).toEqual('Close tab Beta');
    }

    @Test('manual activation focuses without selecting until Enter')
    async manualActivation() {
        const ref = this.ctx.get(ComponentFactory).create(TabsHostComponent, { injector: this.ctx }) as ComponentRef<TabsHostComponent>;
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const tabs = ref.hostView.query(TabsComponent) as ComponentRef<TabsComponent>;
        tabs.instance.activationMode = 'manual';
        await Promise.resolve();
        const bar = tabs.hostView.query(TabBarComponent) as ComponentRef<TabBarComponent>;
        const tabNodes = Array.from(root.querySelectorAll('.tab') as NodeListOf<HTMLElement>);
        const host = ref.instance as TabsHostComponent;
        host.selected = [];

        tabNodes[0].dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.KeyboardEvent('keydown', {
            key: 'ArrowRight',
            bubbles: true
        }));
        await Promise.resolve();
        expect(host.selected).toEqual([]);
        expect(tabNodes[1].getAttribute('tabindex')).toEqual('0');
        tabNodes[1].dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true
        }));
        expect(host.selected).toEqual(['b']);
        expect(bar).toBeTruthy();
    }
}
