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
        expect(dialog.instance.ariaLabel).toEqual('Dialog');
        expect(dialogRoot.textContent).toContain('Dialog title');
        expect(dialogRoot.textContent).toContain('dialog line');
        (dialogRoot.querySelector('.dialog-close') as HTMLElement).click();
        expect(host.closed).toEqual(1);

        const custom = (ref.hostView.queryAll(DialogComponent) as ComponentRef<DialogComponent>[])
            .find(entry => entry.instance.ariaLabel === 'Custom');
        expect(custom).toBeTruthy();
        const customRoot = custom!.hostView.rootNodes[0] as HTMLElement;
        expect(customRoot.className).toContain('host-panel');
        expect(customRoot.querySelector('.projected-body')?.textContent).toContain('projected content');
        expect(customRoot.textContent).toContain('Custom dialog');

        const alert = ref.hostView.query(AlertDialogComponent) as ComponentRef<AlertDialogComponent>;
        const alertRoot = alert.hostView.rootNodes[0] as HTMLElement;
        expect(alertRoot.getAttribute('data-tone')).toEqual('warning');
        expect(alertRoot.textContent).toContain('Accept');
        (alertRoot.querySelector('.alert-action') as HTMLElement).click();
        expect(host.accepted).toEqual(1);
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
        expect(statusRoot.querySelector('[data-status="ok"]')?.textContent).toContain('Service');
        expect(statusRoot.textContent).toContain('ready');

        const keymap = ref.hostView.query(KeymapPanelComponent) as ComponentRef<KeymapPanelComponent>;
        const keymapRoot = keymap.hostView.rootNodes[0] as HTMLElement;
        expect(keymapRoot.textContent).toContain('Ctrl+K');
        expect(keymapRoot.textContent).toContain('palette');
    }
}
