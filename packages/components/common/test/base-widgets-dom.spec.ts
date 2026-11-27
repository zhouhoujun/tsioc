import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { DialogComponent, DialogModule } from '../dialog';
import { AlertDialogComponent, AlertDialogModule } from '../alert';
import { StatusListComponent, StatusListModule } from '../status-list';
import { KeymapPanelComponent, KeymapPanelModule } from '../keymap';

@Component({
    selector: 'common-chrome-host',
    imports: [DialogComponent, AlertDialogComponent, StatusListComponent, KeymapPanelComponent],
    template: `
    <dialog-panel title="Dialog title" :lines="dialogLines" ariaLabel="Dialog" @closeAction="onClose"></dialog-panel>
    <dialog-panel title="Custom dialog" className="host-panel" ariaLabel="Custom" @closeAction="onClose">
        <span class="projected-body">projected content</span>
    </dialog-panel>
    <alert-dialog title="Alert title" tone="warning" actionLabel="Accept"
        :lines="alertLines" ariaLabel="Alert" @acceptAction="onAccept"></alert-dialog>
    <status-list title="Status" hint="hint"
        :items="[{ label: 'Service', status: 'ok', statusLabel: 'ready' }]"></status-list>
    <keymap-panel title="Keys" :items="keys"></keymap-panel>`
})
class CommonChromeHostComponent {
    dialogLines = ['dialog line'];
    alertLines = ['alert line'];
    keys = [{ key: 'Ctrl+K', action: 'palette' }];
    closed = 0;
    accepted = 0;
    onClose = () => { this.closed += 1; };
    onAccept = () => { this.accepted += 1; };
}

@Suite('common chrome widgets DOM')
export class CommonChromeWidgetsDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(CommonChromeHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                DialogModule,
                AlertDialogModule,
                StatusListModule,
                KeymapPanelModule
            ],
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

    @Test('renders dialog chrome and forwards close/accept actions')
    async dialogChrome() {
        const ref = this.ctx.get(ComponentFactory).create(CommonChromeHostComponent, {
            injector: this.ctx
        }) as ComponentRef<CommonChromeHostComponent>;
        await ref.render();
        await Promise.resolve();
        const host = ref.instance as CommonChromeHostComponent;

        const dialog = ref.hostView.query(DialogComponent) as ComponentRef<DialogComponent>;
        const dialogRoot = dialog.hostView.rootNodes[0] as HTMLElement;
        const dialogClose = dialogRoot.querySelector('.dialog-close') as HTMLButtonElement;
        expect(dialog.instance.ariaLabel).toEqual('Dialog');
        expect(dialogRoot.getAttribute('aria-modal')).toBe('true');
        expect(dialogClose.tagName).toBe('BUTTON');
        expect(dialogClose.getAttribute('type')).toBe('button');
        expect(dialogClose.getAttribute('data-plain')).toBe('true');
        expect(dialogClose.classList.contains('ui-plain-button')).toBe(true);
        expect(dialogClose.getAttribute('aria-label')).toBe('Close');
        expect(dialogClose.textContent).toBe('✕');
        expect(dialogRoot.textContent).toContain('Dialog title');
        expect(dialogRoot.textContent).toContain('dialog line');
        dialogClose.click();
        expect(host.closed).toEqual(1);
        dialogRoot.dispatchEvent(new (this.ctx.get(DOCUMENT) as any).defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(host.closed).toEqual(2);

        const custom = (ref.hostView.queryAll(DialogComponent) as ComponentRef<DialogComponent>[])
            .find(entry => entry.instance.ariaLabel === 'Custom');
        expect(custom).toBeTruthy();
        const customRoot = custom!.hostView.rootNodes[0] as HTMLElement;
        expect(customRoot.className).toContain('host-panel');
        expect(customRoot.querySelector('.projected-body')?.textContent).toContain('projected content');
        expect(customRoot.textContent).toContain('Custom dialog');

        const alert = ref.hostView.query(AlertDialogComponent) as ComponentRef<AlertDialogComponent>;
        const alertRoot = alert.hostView.rootNodes[0] as HTMLElement;
        const alertAction = alertRoot.querySelector('.alert-action') as HTMLButtonElement;
        expect(alertRoot.getAttribute('data-tone')).toEqual('warning');
        expect(alertRoot.getAttribute('aria-modal')).toBe('true');
        expect(alertAction.tagName).toBe('BUTTON');
        expect(alertAction.getAttribute('type')).toBe('button');
        expect(alertAction.getAttribute('data-plain')).toBe('true');
        expect(alertRoot.textContent).toContain('Accept');
        alertAction.click();
        expect(host.accepted).toEqual(1);

        // The bare-button reset ships with the dialog widget so a browser host
        // matches the terminal's inline ✕/action without the full UI skin.
        const doc = this.ctx.get(DOCUMENT) as Document;
        const plainStyle = doc.getElementById('tsdi-plain-button-styles');
        expect(plainStyle?.textContent).toContain('.ui-plain-button');
        expect(doc.querySelectorAll('#tsdi-plain-button-styles').length).toEqual(1);
    }

    @Test('renders status rows and keyboard help')
    async statusAndKeys() {
        const ref = this.ctx.get(ComponentFactory).create(CommonChromeHostComponent, {
            injector: this.ctx
        }) as ComponentRef<CommonChromeHostComponent>;
        await ref.render();
        await Promise.resolve();

        const status = ref.hostView.query(StatusListComponent) as ComponentRef<StatusListComponent>;
        const statusRoot = status.hostView.rootNodes[0] as HTMLElement;
        expect(statusRoot.getAttribute('role')).toEqual('list');
        expect(statusRoot.getAttribute('aria-label')).toEqual('Status');
        expect(statusRoot.querySelector('[data-status="ok"]')?.getAttribute('role')).toEqual('listitem');
        expect(statusRoot.querySelector('[data-status="ok"]')?.textContent).toContain('Service');
        expect(statusRoot.textContent).toContain('ready');

        const keymap = ref.hostView.query(KeymapPanelComponent) as ComponentRef<KeymapPanelComponent>;
        const keymapRoot = keymap.hostView.rootNodes[0] as HTMLElement;
        expect(keymapRoot.textContent).toContain('Ctrl+K');
        expect(keymapRoot.textContent).toContain('palette');
    }
}
