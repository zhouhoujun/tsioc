import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DescriptionsComponent, DescriptionsModule } from '../descriptions';

@Component({
    selector: 'descriptions-host',
    imports: [DescriptionsComponent],
    template: `
    <ui-descriptions :items="items" :columns="2" bordered dense ariaLabel="Build"></ui-descriptions>
    <ui-descriptions :items="verticalItems" layout="vertical" ariaLabel="Vertical"></ui-descriptions>
    <ui-descriptions :items="[]" emptyLabel="No details"></ui-descriptions>`
})
class DescriptionsHostComponent {
    verticalItems = [
        { label: 'Name', value: 'tsioc' },
        { label: 'Status', value: 'Ready', hint: 'stable' }
    ];
    items = [
        { label: 'Name', value: 'tsioc' },
        { label: 'Status', value: 'Ready', hint: 'stable', tone: 'success' },
        { label: 'Note', value: 'spans both columns', span: 2 }
    ];
}

@Suite('common descriptions')
export class DescriptionsTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DescriptionsHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, DescriptionsModule],
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

    protected async mount(): Promise<{ ref: ComponentRef<DescriptionsHostComponent>; roots: HTMLElement[] }> {
        const ref = this.ctx.get(ComponentFactory).create(DescriptionsHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DescriptionsHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(DescriptionsComponent) as ComponentRef<DescriptionsComponent>[];
        return {
            ref,
            roots: components.map(component => component.hostView.rootNodes[0] as HTMLElement)
        };
    }

    @Test('renders label/value rows with hints, tones and spans')
    async rendersItems() {
        const { roots } = await this.mount();
        const root = roots[0];
        const items = root.querySelectorAll('.ui-descriptions-item') as NodeListOf<HTMLElement>;

        expect(root.getAttribute('role')).toEqual('list');
        expect(root.getAttribute('aria-label')).toEqual('Build');
        expect(root.className).toContain('is-bordered');
        expect(root.className).toContain('is-dense');
        expect(root.style.getPropertyValue('--ui-descriptions-columns')).toEqual('2');
        expect(items.length).toEqual(3);
        expect(items[0].getAttribute('role')).toEqual('listitem');
        expect(items[0].textContent).toContain('Name: tsioc');
        expect(items[1].getAttribute('data-tone')).toEqual('success');
        expect(items[1].querySelector('.ui-descriptions-hint')?.textContent).toEqual('stable');
        expect(items[2].style.gridColumn).toEqual('span 2');

        const doc = this.ctx.get(DOCUMENT) as Document;
        expect(doc.getElementById('tsdi-descriptions-styles')?.textContent).toContain('.ui-descriptions');
    }

    @Test('renders vertical label/value stacks')
    async verticalLayout() {
        const { roots } = await this.mount();
        const root = roots[1];
        const items = root.querySelectorAll('.ui-descriptions-item') as NodeListOf<HTMLElement>;

        expect(root.className).toContain('is-vertical');
        expect(items.length).toEqual(2);
        expect(items[0].className).toContain('is-vertical');
        expect(items[0].querySelector('.ui-descriptions-label')?.textContent).toEqual('Name');
        expect(items[0].querySelector('.ui-descriptions-value')?.textContent).toEqual('tsioc');
        expect(items[0].querySelector('.ui-descriptions-sep')).toBeFalsy();
        expect(items[1].querySelector('.ui-descriptions-hint')?.textContent).toEqual('stable');
    }

    @Test('renders the empty state')
    async emptyState() {
        const { roots } = await this.mount();
        const empty = roots[2].querySelector('.ui-descriptions-empty') as HTMLElement;
        expect(empty?.textContent).toEqual('No details');
        expect(roots[2].querySelectorAll('.ui-descriptions-item').length).toEqual(0);
    }
}
