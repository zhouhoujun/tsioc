import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { QrCodeComponent, QrCodeModule } from '../qr-code';

@Component({
    selector: 'qr-host',
    imports: [QrCodeComponent],
    template: `<ui-qr-code :matrix="matrix" ariaLabel="Link QR" :quietZone="1"></ui-qr-code>`
})
class QrHostComponent {
    matrix = [
        [1, 0, 1],
        [0, 1, 0],
        [1, 0, 1]
    ];
}

@Suite('common qr code')
export class QrCodeTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(QrHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, QrCodeModule],
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

    @Test('renders the precomputed matrix with a quiet zone')
    async rendersMatrix() {
        const ref = this.ctx.get(ComponentFactory).create(QrHostComponent, {
            injector: this.ctx
        }) as ComponentRef<QrHostComponent>;
        await ref.render();
        await Promise.resolve();
        const qr = ref.hostView.query(QrCodeComponent) as ComponentRef<QrCodeComponent>;
        const root = qr.hostView.rootNodes[0] as HTMLElement;
        const rows = Array.from(root.querySelectorAll('.ui-qr-row') as NodeListOf<HTMLElement>);
        const doc = this.ctx.get(DOCUMENT) as Document;

        expect(root.getAttribute('role')).toEqual('img');
        expect(root.getAttribute('aria-label')).toEqual('Link QR');
        expect(rows.length).toEqual(5);
        expect(rows[0].textContent).toEqual('          ');
        expect(rows[1].textContent).toContain('██');
        expect(rows[1].textContent?.startsWith('  ')).toEqual(true);
        expect(doc.getElementById('tsdi-qr-code-styles')?.textContent).toContain('.ui-qr-code');
    }
}
