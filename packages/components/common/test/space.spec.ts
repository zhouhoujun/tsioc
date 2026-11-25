import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SpaceComponent, SpaceModule } from '../space';

@Component({
    selector: 'space-host',
    imports: [SpaceComponent],
    template: `
    <ui-space :items="['Alpha', 'Beta']" separator="·" ariaLabel="Inline" itemsGap="2ch"><span>Head</span></ui-space>
    <ui-space :items="items" direction="vertical" :action="onItem" ariaLabel="Stack"></ui-space>`
})
class SpaceHostComponent {
    picked = '';
    items = [{ label: 'One' }, { label: 'Two' }];
    onItem = (item: any) => { this.picked = item.label; };
}

@Suite('common space')
export class SpaceTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SpaceHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, SpaceModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<{ roots: HTMLElement[]; host: SpaceHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(SpaceHostComponent, {
            injector: this.ctx
        }) as ComponentRef<SpaceHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(SpaceComponent) as ComponentRef<SpaceComponent>[];
        return {
            roots: components.map(component => component.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as SpaceHostComponent
        };
    }

    @Test('joins horizontal items with a separator and keeps projected content')
    async horizontal() {
        const { roots } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;
                expect(root.getAttribute('role')).toEqual('group');
        expect(root.getAttribute('aria-label')).toEqual('Inline');
        expect(root.className).toContain('is-horizontal');
        expect(root.style.getPropertyValue('--ui-space-gap')).toEqual('2ch');
        expect(root.textContent).toContain('Head');
        expect(root.textContent).toContain('Alpha');
        expect(root.textContent).toContain('Beta');
        expect(root.textContent).toContain('·');
        expect(root.querySelectorAll('.ui-space-sep').length).toEqual(1);
        expect(doc.getElementById('tsdi-space-styles')?.textContent).toContain('.ui-space');
    }

    @Test('stacks vertical items and dispatches click/keyboard actions')
    async vertical() {
        const { roots, host } = await this.mount();
        const root = roots[1];
        const doc = this.ctx.get(DOCUMENT) as Document;
        const items = Array.from(root.querySelectorAll('.ui-space-item') as NodeListOf<HTMLElement>);

        expect(root.className).toContain('is-vertical');
        expect(items.length).toEqual(2);
        expect(items[0].getAttribute('role')).toEqual('button');
        expect(root.querySelectorAll('.ui-space-sep').length).toEqual(0);

        items[1].click();
        expect(host.picked).toEqual('Two');
        items[0].dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.picked).toEqual('One');
    }
}
