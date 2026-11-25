import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DialogComponent, DialogModule } from '../dialog';
import { OverlayManager } from '../src/overlay-manager';

@Suite('common dialog overlay integration')
export class DialogOverlayTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DialogModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }, OverlayManager]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    @Test('an open dialog registers in the stack and Escape respects beforeClose')
    async stackAndDirty() {
        const dialogRef = this.ctx.get(ComponentFactory).create(DialogComponent, { injector: this.ctx }) as ComponentRef<DialogComponent>;
        await dialogRef.render();
        await Promise.resolve();
        const dialog = dialogRef.instance;
        const manager = this.ctx.get(OverlayManager) as OverlayManager;
        let closes = 0;
        let allowClose = true;
        dialog.title = 'Confirm';
        dialog.closeAction = () => { closes += 1; };
        dialog.beforeCloseAction = () => allowClose;
        dialog.overlayOpen = true;
        await Promise.resolve();
        expect(manager.size).toEqual(1);
        expect(manager.active?.kind).toEqual('dialog');

        allowClose = false;
        expect(await manager.escape()).toEqual('blocked');
        expect(closes).toEqual(0);
        expect(manager.size).toEqual(1);

        allowClose = true;
        expect(await manager.escape()).toEqual('closed');
        expect(closes).toEqual(1);
        expect(manager.size).toEqual(0);
    }
}
