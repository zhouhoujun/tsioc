import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TooltipComponent, TooltipModule } from '../tooltip';

@Component({
    selector: 'tooltip-host',
    imports: [TooltipComponent],
    template: `
    <ui-tooltip content="Saves the file" focusable="true" placement="bottom"><button>Save</button></ui-tooltip>
    <ui-tooltip content="Disabled tip" disabled focusable="true"><button>Off</button></ui-tooltip>
    <ui-tooltip content="Delayed tip" focusable="true" :openDelay="10" :closeDelay="10"><button>Later</button></ui-tooltip>`
})
class TooltipHostComponent {
}

@Suite('common tooltip')
export class TooltipTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TooltipHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, TooltipModule],
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

    protected async mount(): Promise<{ roots: HTMLElement[] }> {
        const ref = this.ctx.get(ComponentFactory).create(TooltipHostComponent, {
            injector: this.ctx
        }) as ComponentRef<TooltipHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(TooltipComponent) as ComponentRef<TooltipComponent>[];
        return { roots: components.map(component => component.hostView.rootNodes[0] as HTMLElement) };
    }

    @Test('opens on hover/focus and links the tooltip through aria-describedby')
    async opensAndLinks() {
        const { roots } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(root.getAttribute('tabindex')).toEqual('0');
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();
        expect(root.getAttribute('aria-describedby')).toEqual('');
        expect(root.textContent).toContain('Save');
        expect(doc.getElementById('tsdi-tooltip-styles')?.textContent).toContain('.ui-tooltip');

        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseenter'));
        let popup = root.querySelector('.ui-tooltip-popup') as HTMLElement;
        expect(popup).toBeTruthy();
        expect(popup.getAttribute('role')).toEqual('tooltip');
        expect(root.getAttribute('aria-describedby')).toEqual(popup.id);
        expect(popup.textContent).toEqual('Saves the file');
        expect(popup.className).toContain('is-bottom');

        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseleave'));
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();
        expect(root.getAttribute('aria-describedby')).toEqual('');

        root.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        popup = root.querySelector('.ui-tooltip-popup') as HTMLElement;
        expect(popup).toBeTruthy();
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();
    }

    @Test('honors hover intent delays and closes immediately on Escape')
    async delayedHover() {
        const { roots } = await this.mount();
        const root = roots[2];
        const doc = this.ctx.get(DOCUMENT) as Document;
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseenter'));
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();
        await wait(40);
        const popup = root.querySelector('.ui-tooltip-popup') as HTMLElement;
        expect(popup).toBeTruthy();

        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseleave'));
        expect(root.querySelector('.ui-tooltip-popup')).toBeTruthy();
        await wait(40);
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();

        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseenter'));
        await wait(40);
        expect(root.querySelector('.ui-tooltip-popup')).toBeTruthy();
        root.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();

        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseenter'));
        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseleave'));
        await wait(40);
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();
    }

    @Test('disabled tooltips stay closed and out of the tab order')
    async disabled() {
        const { roots } = await this.mount();
        const root = roots[1];
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(root.getAttribute('tabindex')).toEqual('-1');
        root.dispatchEvent(new (doc.defaultView as any).MouseEvent('mouseenter'));
        root.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        expect(root.querySelector('.ui-tooltip-popup')).toBeFalsy();
        expect(root.getAttribute('aria-describedby')).toEqual('');
    }
}
