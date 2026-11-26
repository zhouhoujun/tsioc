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
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' }).window.document;
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

    @Test('programmatic close still notifies the host once')
    async programmaticClose() {
        const dialogRef = this.ctx.get(ComponentFactory).create(DialogComponent, { injector: this.ctx }) as ComponentRef<DialogComponent>;
        await dialogRef.render();
        await Promise.resolve();
        const dialog = dialogRef.instance;
        const manager = this.ctx.get(OverlayManager) as OverlayManager;
        let closes = 0;
        dialog.closeAction = () => { closes += 1; };
        dialog.overlayOpen = true;
        expect(manager.size).toEqual(1);
        dialog.close();
        expect(closes).toEqual(1);
        expect(manager.size).toEqual(0);
        expect(dialog.overlayOpen).toEqual(false);
    }

    @Test('locks document scroll while open and restores it after close')
    async scrollLock() {
        const doc = this.ctx.get(DOCUMENT) as Document;
        doc.body.style.overflow = '';
        const first = this.ctx.get(ComponentFactory).create(DialogComponent, { injector: this.ctx }) as ComponentRef<DialogComponent>;
        const second = this.ctx.get(ComponentFactory).create(DialogComponent, { injector: this.ctx }) as ComponentRef<DialogComponent>;
        await first.render();
        await second.render();
        await Promise.resolve();

        first.instance.overlayOpen = true;
        expect(doc.body.style.overflow).toEqual('hidden');
        second.instance.overlayOpen = true;
        expect(doc.body.style.overflow).toEqual('hidden');

        first.instance.close();
        expect(doc.body.style.overflow).toEqual('hidden');
        second.instance.close();
        expect(doc.body.style.overflow).toEqual('');

        first.instance.overlayOpen = true;
        expect(doc.body.style.overflow).toEqual('hidden');
        first.instance.scrollLock = false;
        expect(doc.body.style.overflow).toEqual('');
        first.instance.scrollLock = true;
        first.instance.overlayOpen = false;
        expect(doc.body.style.overflow).toEqual('');

        first.destroy();
        second.destroy();
    }

    @Test('adds a clickable backdrop and restores background inert state')
    async backdropAndInert() {
        const doc = this.ctx.get(DOCUMENT) as Document;
        const outside = doc.createElement('section');
        outside.className = 'outside-content';
        doc.body.appendChild(outside);
        const dialogRef = this.ctx.get(ComponentFactory).create(DialogComponent, { injector: this.ctx }) as ComponentRef<DialogComponent>;
        await dialogRef.render();
        await Promise.resolve();
        const dialog = dialogRef.instance;
        let closes = 0;
        dialog.title = 'Confirm';
        dialog.closeAction = () => { closes += 1; };
        dialog.overlayOpen = true;
        await Promise.resolve();
        const backdrop = doc.querySelector('.ui-overlay-backdrop') as HTMLElement;
        expect(!!backdrop).toEqual(true);
        expect(outside.hasAttribute('inert')).toEqual(true);
        expect(outside.getAttribute('aria-hidden')).toEqual('true');

        backdrop.click();
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(dialog.overlayOpen).toEqual(false);
        expect(closes).toEqual(1);
        expect(doc.querySelector('.ui-overlay-backdrop')).toBeFalsy();
        expect(outside.hasAttribute('inert')).toEqual(false);
        expect(outside.hasAttribute('aria-hidden')).toEqual(false);
        outside.remove();
        dialogRef.destroy();
    }

    @Test('backdrop can be disabled per dialog')
    async backdropDisabled() {
        const doc = this.ctx.get(DOCUMENT) as Document;
        const dialogRef = this.ctx.get(ComponentFactory).create(DialogComponent, { injector: this.ctx }) as ComponentRef<DialogComponent>;
        await dialogRef.render();
        await Promise.resolve();
        dialogRef.instance.backdrop = false;
        dialogRef.instance.overlayOpen = true;
        await Promise.resolve();
        expect(doc.querySelector('.ui-overlay-backdrop')).toBeFalsy();
        dialogRef.instance.close();
        dialogRef.destroy();
    }

    @Test('focuses the panel, traps Tab and restores the trigger')
    async focusCycle() {
        const doc = this.ctx.get(DOCUMENT) as Document;
        const manager = this.ctx.get(OverlayManager) as OverlayManager;
        const trigger = doc.createElement('button');
        trigger.textContent = 'open';
        doc.body.appendChild(trigger);
        trigger.focus();

        const panel = doc.createElement('div');
        panel.className = 'dialog-panel';
        const first = doc.createElement('button');
        const second = doc.createElement('button');
        panel.appendChild(first);
        panel.appendChild(second);
        doc.body.appendChild(panel);

        manager.register({ id: 'focus-test', kind: 'dialog', element: panel });
        expect(doc.activeElement === first).toBe(true);
        manager.close('focus-test');
        expect(doc.activeElement === trigger).toBe(true);

        // Dialog-owned Tab trap (the overlay manager owns initial/restore focus).
        const dialog = new DialogComponent({ nativeElement: panel } as any);
        (dialog as any)._overlayOpen = true;
        second.focus();
        dialog.handleKeydown({ key: 'Tab', preventDefault() { /* asserted by focus */ } });
        expect(doc.activeElement === first).toBe(true);
        first.focus();
        dialog.handleKeydown({ key: 'Tab', shiftKey: true, preventDefault() { /* wrap */ } });
        expect(doc.activeElement === second).toBe(true);

        panel.remove();
        trigger.remove();
    }
}
