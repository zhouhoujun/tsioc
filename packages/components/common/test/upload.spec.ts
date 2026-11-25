import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { UploadComponent, UploadModule } from '../upload';

@Component({
    selector: 'upload-host',
    imports: [UploadComponent],
    template: `
    <ui-upload label="Attach" hint="Max 2" ariaLabel="Files" :files="files"
        :pickAction="onPick" :removeAction="onRemove"></ui-upload>
    <ui-upload label="Locked" disabled :files="['a.txt']"></ui-upload>`
})
class UploadHostComponent {
    picks = 0;
    removed = '';
    files = [{ name: 'one.txt', size: '1 KB' }, 'two.txt'];
    onPick = () => { this.picks += 1; };
    onRemove = (name: string) => { this.removed = name; };
}

@Suite('common upload')
export class UploadTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(UploadHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, UploadModule],
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

    protected async mount(): Promise<{ roots: HTMLElement[]; host: UploadHostComponent }> {
        const ref = this.ctx.get(ComponentFactory).create(UploadHostComponent, {
            injector: this.ctx
        }) as ComponentRef<UploadHostComponent>;
        await ref.render();
        await Promise.resolve();
        const uploads = ref.hostView.queryAll(UploadComponent) as ComponentRef<UploadComponent>[];
        return {
            roots: uploads.map(upload => upload.hostView.rootNodes[0] as HTMLElement),
            host: ref.instance as UploadHostComponent
        };
    }

    @Test('renders files, picks and removes them')
    async picksAndRemoves() {
        const { roots, host } = await this.mount();
        const root = roots[0];
        const doc = this.ctx.get(DOCUMENT) as Document;
        const trigger = root.querySelector('.ui-upload-trigger') as HTMLElement;

        expect(root.getAttribute('role')).toEqual('group');
        expect(root.getAttribute('aria-label')).toEqual('Files');
        expect(trigger.getAttribute('role')).toEqual('button');
        expect(trigger.getAttribute('tabindex')).toEqual('0');
        expect(root.textContent).toContain('Attach');
        expect(root.textContent).toContain('Max 2');
        expect(root.textContent).toContain('one.txt');
        expect(root.textContent).toContain('1 KB');
        expect(root.textContent).toContain('two.txt');
        expect(doc.getElementById('tsdi-upload-styles')?.textContent).toContain('.ui-upload');

        trigger.click();
        expect(host.picks).toEqual(1);
        trigger.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(host.picks).toEqual(2);

        const remove = root.querySelectorAll('.ui-upload-remove')[1] as HTMLButtonElement;
        expect(remove.tagName).toEqual('BUTTON');
        expect(remove.getAttribute('data-plain')).toEqual('true');
        remove.click();
        expect(host.removed).toEqual('two.txt');
    }

    @Test('disabled uploads are inert')
    async disabled() {
        const { roots, host } = await this.mount();
        const root = roots[1];
        const trigger = root.querySelector('.ui-upload-trigger') as HTMLElement;
        expect(trigger.getAttribute('tabindex')).toEqual('-1');
        expect(trigger.getAttribute('aria-disabled')).toEqual('true');
        trigger.click();
        expect(host.picks).toEqual(0);
        expect(root.querySelector('.ui-upload-remove')).toBeFalsy();
    }
}
