import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ChipComponent, ChipModule } from '../chip';

@Component({
    selector: 'chip-host',
    imports: [ChipComponent],
    template: `
    <ui-chip label="feature" ariaLabel="Feature chip" selected
        :action="onAction" :removeAction="onRemove" :closable="true"></ui-chip>
    <ui-chip label="locked" disabled :action="onAction" :removeAction="onRemove" :closable="true"></ui-chip>
    <ui-chip label="plain" variant="outline"></ui-chip>`
})
class ChipHostComponent {
    actions = 0;
    removes = 0;
    onAction = () => { this.actions += 1; };
    onRemove = () => { this.removes += 1; };
}

@Suite('common chip')
export class ChipTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ChipHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ChipModule],
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

    protected async mount(): Promise<{ ref: ComponentRef<ChipHostComponent>; chips: HTMLElement[]; host: ChipHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(ChipHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ChipHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(ChipComponent) as ComponentRef<ChipComponent>[];
        return {
            ref,
            chips: components.map(component => component.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as ChipHostComponent
        };
    }

    @Test('renders a clickable chip with a plain close button')
    async rendersChip() {
        const { chips, host } = await this.mount();
        const chip = chips[0];
        const close = chip.querySelector('.ui-chip-close') as HTMLButtonElement;
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(chip.getAttribute('role')).toEqual('button');
        expect(chip.getAttribute('aria-label')).toEqual('Feature chip');
        expect(chip.getAttribute('aria-pressed')).toEqual('true');
        expect(chip.getAttribute('tabindex')).toEqual('0');
        expect(chip.textContent).toContain('feature');
        expect(close?.tagName).toEqual('BUTTON');
        expect(close.getAttribute('type')).toEqual('button');
        expect(close.getAttribute('data-plain')).toEqual('true');
        expect(close.getAttribute('aria-label')).toEqual('Remove');
        expect(doc.getElementById('tsdi-chip-styles')?.textContent).toContain('.ui-chip');

        chip.click();
        expect(host.actions).toEqual(1);
        close.click();
        // Closing must not also trigger the chip action.
        expect(host.removes).toEqual(1);
        expect(host.actions).toEqual(1);
    }

    @Test('keyboard activates the chip and its close affordance')
    async keyboard() {
        const { chips, host } = await this.mount();
        const chip = chips[0];
        const close = chip.querySelector('.ui-chip-close') as HTMLButtonElement;
        const doc = this.ctx.get(DOCUMENT) as Document;

        chip.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.actions).toEqual(1);

        close.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        expect(host.removes).toEqual(1);
        expect(host.actions).toEqual(1);
    }

    @Test('disabled chips are inert and passive chips stay a group')
    async disabledAndPassive() {
        const { chips, host } = await this.mount();
        const disabled = chips[1];
        const passive = chips[2];
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(disabled.getAttribute('tabindex')).toEqual('-1');
        disabled.click();
        disabled.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.actions).toEqual(0);
        expect(host.removes).toEqual(0);

        expect(passive.getAttribute('role')).toEqual('group');
        expect(passive.getAttribute('tabindex')).toEqual('-1');
        expect(passive.querySelector('.ui-chip-close')).toBeFalsy();
    }
}
