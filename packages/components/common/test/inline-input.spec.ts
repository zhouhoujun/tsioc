import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { InlineInputComponent, InlineInputModule } from '../inline-input';

async function settle(): Promise<void> {
    for (let index = 0; index < 20; index++) await Promise.resolve();
}

@Suite('common inline input')
export class InlineInputTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(InlineInputModule, {
            deps: [HtmlTemplateModule, ComponentsModule],
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

    private async mount(): Promise<{ ref: ComponentRef<InlineInputComponent>; input: InlineInputComponent; root: HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(InlineInputComponent, { injector: this.ctx }) as ComponentRef<InlineInputComponent>;
        await ref.render();
        await settle();
        const input = ref.instance;
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        return { ref, input, root };
    }

    @Test('Enter commits and notifies the host')
    async commitsOnEnter() {
        const { ref, input, root } = await this.mount();
        input.value = 'Draft';
        let changed = '';
        let submitted = '';
        let edits = 0;
        input.changeAction = value => { changed = value; };
        input.submitAction = value => { submitted = value; };
        input.editAction = () => { edits += 1; };
        await settle();

        (root.querySelector('.ui-inline-input-value') as HTMLElement).click();
        await settle();
        expect(input.editingState).toEqual(true);
        expect(edits).toEqual(1);
        const field = root.querySelector('.ui-inline-input-field') as HTMLInputElement;
        expect(field).toBeTruthy();
        field.value = 'Renamed';
        field.dispatchEvent(new (field.ownerDocument.defaultView as any).Event('input', { bubbles: true }));
        field.dispatchEvent(new (field.ownerDocument.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(input.editingState).toEqual(false);
        expect(input.value).toEqual('Renamed');
        expect(changed).toEqual('Renamed');
        expect(submitted).toEqual('Renamed');
        ref.destroy();
    }

    @Test('Escape cancels and blur commits when enabled')
    async cancelAndBlur() {
        const { ref, input, root } = await this.mount();
        input.value = 'Original';
        let cancels = 0;
        let commits = 0;
        input.cancelAction = () => { cancels += 1; };
        input.submitAction = () => { commits += 1; };
        await settle();

        input.beginEdit();
        await settle();
        let field = root.querySelector('.ui-inline-input-field') as HTMLInputElement;
        field.value = 'Nope';
        field.dispatchEvent(new (field.ownerDocument.defaultView as any).Event('input', { bubbles: true }));
        field.dispatchEvent(new (field.ownerDocument.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(input.editingState).toEqual(false);
        expect(input.value).toEqual('Original');
        expect(cancels).toEqual(1);
        expect(commits).toEqual(0);

        input.beginEdit();
        await settle();
        field = root.querySelector('.ui-inline-input-field') as HTMLInputElement;
        field.value = 'Blurred';
        field.dispatchEvent(new (field.ownerDocument.defaultView as any).Event('input', { bubbles: true }));
        field.dispatchEvent(new (field.ownerDocument.defaultView as any).Event('blur', { bubbles: false }));
        expect(input.value).toEqual('Blurred');
        expect(commits).toEqual(1);
        ref.destroy();
    }

    @Test('disabled values cannot enter edit mode')
    async disabled() {
        const { ref, input, root } = await this.mount();
        input.disabled = true;
        await settle();
        (root.querySelector('.ui-inline-input-value') as HTMLElement).click();
        expect(input.editingState).toEqual(false);
        expect((root.querySelector('.ui-inline-input-edit') as HTMLButtonElement).disabled).toEqual(true);
        ref.destroy();
    }
}
