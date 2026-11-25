import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DrawerComponent, DrawerModule } from '../drawer';

@Component({
    selector: 'drawer-host',
    imports: [DrawerComponent],
    template: `
    <ui-drawer :visible="shown" title="Settings" :lines="['Line one', 'Line two']"
        placement="left" :closeAction="onClose"><span>Body</span></ui-drawer>
    <ui-drawer visible title="Pinned" :closable="false" :lines="['Pinned body']"></ui-drawer>`
})
class DrawerHostComponent {
    shown = false;
    closes = 0;
    onClose = () => { this.closes += 1; this.shown = false; };
}

@Suite('common drawer')
export class DrawerTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DrawerHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, DrawerModule],
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

    protected async mount(): Promise<{ roots: HTMLElement[]; host: DrawerHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(DrawerHostComponent, {
            injector: this.ctx
        }) as ComponentRef<DrawerHostComponent>;
        await ref.render();
        await Promise.resolve();
        return {
            roots: (ref.hostView.rootNodes as HTMLElement[]).filter(node => node?.nodeType === 1),
            host: ref.instance as DrawerHostComponent
        };
    }

    @Test('opens, closes and exposes the panel chrome')
    async opensAndCloses() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        const panel = root.querySelector('.ui-drawer') as HTMLElement;
        expect(panel).toBeTruthy();
        expect(panel.hasAttribute('hidden')).toEqual(true);
        host.shown = true;
        await Promise.resolve();
        await Promise.resolve();
        expect(panel.hasAttribute('hidden')).toEqual(false);
        expect(panel.getAttribute('role')).toEqual('dialog');
        expect(panel.getAttribute('aria-label')).toEqual('Settings');
        expect(panel.className).toContain('is-left');
        expect(panel.textContent).toContain('Line one');
        expect(panel.textContent).toContain('Line two');
        expect(panel.textContent).toContain('Body');
        expect(panel.style.width).toEqual('32ch');
        expect(doc.getElementById('tsdi-drawer-styles')?.textContent).toContain('.ui-drawer');

        const close = panel.querySelector('.ui-drawer-close') as HTMLButtonElement;
        expect(close.tagName).toEqual('BUTTON');
        expect(close.getAttribute('data-plain')).toEqual('true');
        close.click();
        await Promise.resolve();
        await Promise.resolve();
        expect(host.closes).toEqual(1);
        expect(panel.hasAttribute('hidden')).toEqual(true);
    }

    @Test('Escape closes and non-closable drawers omit the button')
    async escapeAndClosable() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;

        host.shown = true;
        await Promise.resolve();
        await Promise.resolve();
        const panel = root.querySelector('.ui-drawer') as HTMLElement;
        expect(panel.hasAttribute('hidden')).toEqual(false);
        panel.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await Promise.resolve();
        expect(host.closes).toEqual(1);
        expect(panel.hasAttribute('hidden')).toEqual(true);

        const pinned = roots[1].querySelector('.ui-drawer') as HTMLElement;
        expect(pinned).toBeTruthy();
        expect(roots[1].querySelector('.ui-drawer-close')).toBeFalsy();
    }
}
