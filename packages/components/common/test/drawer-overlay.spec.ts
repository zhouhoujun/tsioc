import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DrawerComponent, DrawerModule } from '../drawer';
import { OverlayManager } from '../src/overlay-manager';

@Suite('common drawer overlay integration')
export class DrawerOverlayTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DrawerModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useFactory: () => {
                const { JSDOM } = require('jsdom');
                return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
            } }, OverlayManager]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    @Test('drawer registers and honors beforeClose')
    async stack() {
        const drawerRef = this.ctx.get(ComponentFactory).create(DrawerComponent, { injector: this.ctx }) as ComponentRef<DrawerComponent>;
        await drawerRef.render();
        await Promise.resolve();
        const drawer = drawerRef.instance;
        const manager = this.ctx.get(OverlayManager) as OverlayManager;
        let closes = 0;
        let allow = true;
        drawer.title = 'Settings';
        drawer.closeAction = () => { closes += 1; };
        drawer.beforeCloseAction = () => allow;
        drawer.initialFocus = 'button';
        drawer.restoreFocus = false;
        drawer.overlayOpen = true;
        const doc = this.ctx.get(DOCUMENT) as Document;
        expect(doc.body.style.overflow).toEqual('hidden');
        expect(manager.size).toEqual(1);
        expect(manager.active?.initialFocus).toEqual('button');
        expect(manager.active?.restoreFocus).toEqual(false);
        allow = false;
        expect(await manager.escape()).toEqual('blocked');
        expect(closes).toEqual(0);
        allow = true;
        expect(await manager.escape()).toEqual('closed');
        expect(closes).toEqual(1);
        expect(manager.size).toEqual(0);
        expect(doc.body.style.overflow).toEqual('');
        drawerRef.destroy();
    }
}
