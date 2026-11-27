import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { PopoverComponent, PopoverModule } from '../popover';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'popover-host',
    imports: [PopoverComponent],
    template: `
    <ui-popover :visible="shown" title="Help" :lines="['First line', 'Second line']"
        placement="top" :closeAction="onClose"><span>Anchor</span></ui-popover>
    <ui-popover visible title="Pinned" :closable="false" :lines="['Pinned body']"><span>Other</span></ui-popover>
`
})
class PopoverHostComponent {
    shown = false;
    closes = 0;
    onClose = () => { this.closes += 1; this.shown = false; };
}

@Suite('common popover')
export class PopoverTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(PopoverHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, PopoverModule],
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

    protected async mount(): Promise<{ ref: ComponentRef<PopoverHostComponent>; roots: HTMLElement[]; host: PopoverHostComponent; popovers: ComponentRef<PopoverComponent>[] }> {
        const ref = this.ctx.get(ComponentFactory).create(PopoverHostComponent, {
            injector: this.ctx
        }) as ComponentRef<PopoverHostComponent>;
        await ref.render();
        await Promise.resolve();
        const components = ref.hostView.queryAll(PopoverComponent) as ComponentRef<PopoverComponent>[];
        return {
            ref,
            roots: components.map(component => component.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as PopoverHostComponent,
            popovers: components
        };
    }

    @Test('open popover passes the shared accessibility audit')
    async a11y() {
        const { roots, host } = await this.mount();
        host.shown = true;
        await Promise.resolve();
        await Promise.resolve();
        expect(formatViolations(auditA11y(roots[0], this.ctx.get(DOCUMENT)))).toEqual('');
    }

    @Test('renders the panel chrome and closes through the plain button')
    async rendersAndCloses() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(root.querySelector('.ui-popover-popup')).toBeFalsy();
        host.shown = true;
        await Promise.resolve();
        await Promise.resolve();
        const popup = root.querySelector('.ui-popover-popup') as HTMLElement;
        expect(popup).toBeTruthy();
        expect(popup.getAttribute('role')).toEqual('dialog');
        expect(popup.getAttribute('aria-label')).toEqual('Help');
        expect(popup.className).toContain('is-top');
        expect(popup.textContent).toContain('Help');
        expect(popup.textContent).toContain('First line');
        expect(popup.textContent).toContain('Second line');
        expect(doc.getElementById('tsdi-popover-styles')?.textContent).toContain('.ui-popover');

        const close = popup.querySelector('.ui-popover-close') as HTMLButtonElement;
        expect(close.tagName).toEqual('BUTTON');
        expect(close.getAttribute('data-plain')).toEqual('true');
        close.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(host.closes).toEqual(1);
        expect(root.querySelector('.ui-popover-popup')).toBeFalsy();
    }

    @Test('Escape closes and non-closable panels omit the button')
    async escapeAndClosable() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        host.shown = true;
        await Promise.resolve();
        await Promise.resolve();
        const popup = root.querySelector('.ui-popover-popup') as HTMLElement;
        expect(popup).toBeTruthy();
        popup.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
        expect(host.closes).toEqual(1);
        expect(root.querySelector('.ui-popover-popup')).toBeFalsy();

        const pinned = roots[1].querySelector('.ui-popover-popup') as HTMLElement;
        expect(pinned).toBeTruthy();
        expect(roots[1].querySelector('.ui-popover-close')).toBeFalsy();
    }
}
