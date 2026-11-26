import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AccordionComponent, AccordionItem, installAccordionStyles } from '../accordion';

@Component({
    selector: 'accordion-dom-host',
    imports: [AccordionComponent],
    template: `
    <div class="accordion-host">
        <ui-accordion title="HTTP" ariaLabel="HTTP group" :count="4"
            :expanded="expanded" :toggleAction="changed">
            <div class="projected-item">One</div>
        </ui-accordion>
        <ui-accordion data-accordion="items" title="Items" :items="rows"
            :selectAction="onItem" :dragStartAction="onDrag" :draggable="true"></ui-accordion>
    </div>`
})
class AccordionDomHostComponent {
    expanded = true;
    states: boolean[] = [];

    rows: AccordionItem[] = [
        { id: 'a', label: 'Alpha', description: 'First', badge: 2, className: 'row-a', attrs: { 'data-row': 'a' }, value: { id: 'a' } },
        { id: 'b', label: 'Beta', disabled: true, value: { id: 'b' } }
    ];
    selected: any[] = [];
    dragged: any[] = [];

    changed = (value: boolean): void => {
        this.states.push(value);
        this.expanded = value;
    };
    onItem = (item: any): void => { this.selected.push(item); };
    onDrag = (_event: any, item: any): void => { this.dragged.push(item); };
}

@Suite('common accordion DOM')
export class AccordionDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AccordionDomHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
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

    protected async mount(): Promise<ComponentRef<AccordionDomHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(AccordionDomHostComponent, {
            injector: this.ctx
        }) as ComponentRef<AccordionDomHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('renders the header, count and projected body, then collapses in place')
    async rendersAndCollapses() {
        const ref = await this.mount();
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        const accordion = root.querySelector('.ui-accordion') as HTMLElement;
        const header = root.querySelector('.ui-accordion-header') as HTMLButtonElement;
        const body = root.querySelector('.ui-accordion-body') as HTMLElement;

        expect(accordion).toBeTruthy();
        expect(accordion.classList.contains('is-md')).toEqual(true);
        expect(accordion.classList.contains('is-default')).toEqual(true);
        expect(header.getAttribute('aria-expanded')).toEqual('true');
        expect(header.getAttribute('aria-label')).toEqual('HTTP group');
        expect(header.id).toEqual(body.getAttribute('aria-labelledby'));
        expect(body.id).toEqual(header.getAttribute('aria-controls'));
        expect(body.getAttribute('role')).toEqual('region');
        expect(body.getAttribute('aria-hidden')).toEqual('false');
        expect(body.id).toBeTruthy();
        expect(root.querySelector('.ui-accordion-title')?.textContent).toEqual('HTTP');
        expect(root.querySelector('.ui-accordion-count')?.textContent).toEqual('4');
        expect(body.hasAttribute('hidden')).toEqual(false);
        expect(body.textContent).toContain('One');
        expect(root.textContent).toContain('One');

        header.click();
        await Promise.resolve();
        await Promise.resolve();

        expect(ref.instance.states).toEqual([false]);
        expect(header.getAttribute('aria-expanded')).toEqual('false');
        expect(body.getAttribute('aria-hidden')).toEqual('true');
        expect(accordion.getAttribute('data-expanded')).toEqual('false');
        expect(body.hasAttribute('hidden')).toEqual(true);
        // Projected content stays mounted so host widgets keep their state.
        expect(root.textContent).toContain('One');

        header.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(ref.instance.states).toEqual([false, true]);
        expect(body.hasAttribute('hidden')).toEqual(false);
    }

    @Test('renders item rows and forwards select/drag payloads')
    async rendersItemRows() {
        const ref = await this.mount();
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        const accordion = root.querySelector('[data-accordion="items"]') as HTMLElement;
        const rows = Array.from(accordion.querySelectorAll('.ui-accordion-item')) as HTMLElement[];

        expect(rows.length).toEqual(2);
        expect(rows[0].getAttribute('role')).toEqual('button');
        expect(rows[0].getAttribute('tabindex')).toEqual('0');
        expect(rows[1].getAttribute('tabindex')).toEqual('-1');
        expect(rows[1].getAttribute('aria-disabled')).toEqual('true');
        expect(rows[0].getAttribute('data-row')).toEqual('a');
        expect(rows[0].draggable).toEqual(true);
        expect(rows[0].querySelector('.ui-accordion-item-label')?.textContent).toEqual('Alpha');
        expect(rows[0].querySelector('.ui-accordion-item-description')?.textContent).toEqual('First');
        expect(rows[0].querySelector('.ui-accordion-item-badge')?.textContent).toEqual('2');

        rows[0].dispatchEvent(new (this.ctx.get(DOCUMENT) as Document).defaultView!.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(ref.instance.selected).toEqual([{ id: 'a' }]);
        rows[0].click();
        expect(ref.instance.selected).toEqual([{ id: 'a' }, { id: 'a' }]);
        rows[0].dispatchEvent(new (this.ctx.get(DOCUMENT) as Document).defaultView!.Event('dragstart', { bubbles: true }));
        expect(ref.instance.dragged).toEqual([{ id: 'a' }]);

        rows[1].click();
        expect(ref.instance.selected).toEqual([{ id: 'a' }, { id: 'a' }]);
    }

    @Test('installs the shared accordion skin once per document')
    async installsSharedSkin() {
        const doc = this.ctx.get(DOCUMENT) as Document;
        installAccordionStyles(doc);
        installAccordionStyles(doc);
        expect(doc.querySelectorAll('#tsdi-accordion-styles').length).toEqual(1);
        const css = doc.getElementById('tsdi-accordion-styles')?.textContent || '';
        expect(css).toContain('.ui-accordion-header:hover');
        expect(css).toContain('.ui-accordion[data-expanded="false"] .ui-accordion-caret::before');
        expect(css).toContain('--ui-accordion-caret-mark, 8px');
        expect(css).toContain('.ui-accordion.is-sm .ui-accordion-header');
        expect(css).toContain('@keyframes ui-accordion-reveal');
        expect(css).toContain('prefers-reduced-motion');
    }
}
