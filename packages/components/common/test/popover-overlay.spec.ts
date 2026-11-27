import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { PopoverComponent, PopoverModule } from '../popover';
import { OverlayManager } from '../src/overlay-manager';

@Suite('common popover overlay integration')
export class PopoverOverlayTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(PopoverModule, {
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

    @Test('popover registers and honors beforeClose')
    async stack() {
        const ref = this.ctx.get(ComponentFactory).create(PopoverComponent, { injector: this.ctx }) as ComponentRef<PopoverComponent>;
        await ref.render();
        await Promise.resolve();
        const popover = ref.instance;
        const manager = this.ctx.get(OverlayManager) as OverlayManager;
        let closes = 0;
        let allow = true;
        popover.title = 'Help';
        popover.closeAction = () => { closes += 1; };
        popover.beforeCloseAction = () => allow;
        popover.initialFocus = 'button';
        popover.restoreFocus = false;
        popover.overlayOpen = true;
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
        ref.destroy();
    }
}
