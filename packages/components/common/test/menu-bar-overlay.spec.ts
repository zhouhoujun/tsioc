import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { MenuBarComponent, MenuBarModule } from '../menu-bar';
import { OverlayManager } from '../src/overlay-manager';

async function settle(): Promise<void> {
    for (let index = 0; index < 20; index++) await Promise.resolve();
}

@Suite('common menu bar overlay stack')
export class MenuBarOverlayTest {
    ctx!: ApplicationContext;
    doc!: any;

    @Before()
    async init() {
        const { JSDOM } = require('jsdom');
        this.doc = new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
        this.ctx = await Application.run(MenuBarModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useFactory: () => this.doc }, OverlayManager]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    private async mount(): Promise<{ ref: ComponentRef<MenuBarComponent>; menu: MenuBarComponent; manager: OverlayManager }> {
        const ref = this.ctx.get(ComponentFactory).create(MenuBarComponent, { injector: this.ctx }) as ComponentRef<MenuBarComponent>;
        await ref.render();
        await settle();
        const menu = ref.instance;
        menu.groups = [{ items: [{ id: 'run', label: 'Run' }] }];
        return { ref, menu, manager: this.ctx.get(OverlayManager) as OverlayManager };
    }

    @Test('the open menu registers and honors beforeClose vetoes')
    async veto() {
        const { ref, menu, manager } = await this.mount();
        menu.overlayEnabled = true;
        menu.open = true;
        expect(manager.size).toEqual(1);
        expect(manager.active?.kind).toEqual('menu');

        let allow = false;
        menu.beforeCloseAction = () => allow;
        expect(await manager.escape()).toEqual('blocked');
        expect(menu.open).toEqual(true);
        expect(manager.size).toEqual(1);

        allow = true;
        expect(await manager.escape()).toEqual('closed');
        expect(menu.open).toEqual(false);
        expect(manager.size).toEqual(0);
        ref.destroy();
    }

    @Test('document Escape and outside clicks route through the active overlay')
    async documentRouting() {
        const { ref, menu, manager } = await this.mount();
        menu.overlayEnabled = true;
        menu.open = true;
        this.doc.dispatchEvent(new (this.doc.defaultView as any).KeyboardEvent('keydown', {
            key: 'Escape', bubbles: true, cancelable: true
        }));
        await settle();
        expect(menu.open).toEqual(false);
        expect(manager.size).toEqual(0);

        menu.open = true;
        await settle();
        expect(manager.size).toEqual(1);
        this.doc.dispatchEvent(new (this.doc.defaultView as any).MouseEvent('mousedown', { bubbles: true }));
        await settle();
        expect(menu.open).toEqual(false);
        expect(manager.size).toEqual(0);
        ref.destroy();
    }

    @Test('programmatic close unregisters without leaving a stale entry')
    async programmaticClose() {
        const { ref, menu, manager } = await this.mount();
        menu.overlayEnabled = true;
        menu.open = true;
        menu.close(false);
        expect(menu.open).toEqual(false);
        expect(manager.size).toEqual(0);
        ref.destroy();
    }
}
