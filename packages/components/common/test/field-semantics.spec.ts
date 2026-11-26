import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { FieldComponent, FieldModule } from '../field';
import { TextFieldComponent, TextFieldModule } from '../text-field';
import { SearchFieldComponent, SearchFieldModule } from '../search-field';

@Suite('common field semantics')
export class FieldSemanticsTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(FieldModule, {
            deps: [HtmlTemplateModule, ComponentsModule, TextFieldModule, SearchFieldModule],
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

    private async mount<T>(type: any, setup: (instance: T) => void): Promise<{ ref: ComponentRef<T>; root: HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(type, { injector: this.ctx }) as ComponentRef<T>;
        await ref.render();
        setup(ref.instance);
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        return { ref, root };
    }

    @Test('counts code points and ignores shortcuts during IME composition')
    async countAndComposition() {
        let submits = 0;
        const text = await this.mount<TextFieldComponent>(TextFieldComponent, field => {
            field.maxLength = 5;
            field.showCount = true;
            field.value = 'a😀';
            field.submitAction = () => { submits += 1; };
        });
        const doc = this.ctx.get(DOCUMENT) as Document;
        const input = text.root.querySelector('input') as HTMLInputElement;
        expect(input.getAttribute('maxlength')).toEqual('5');
        expect(text.root.querySelector('.ui-field-count')?.textContent).toEqual('2 / 5');

        input.dispatchEvent(new (doc.defaultView as any).Event('compositionstart', { bubbles: true }));
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(submits).toEqual(0);

        input.dispatchEvent(new (doc.defaultView as any).Event('compositionend', { bubbles: true }));
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(submits).toEqual(1);

        let searchSubmits = 0;
        const search = await this.mount<SearchFieldComponent>(SearchFieldComponent, field => {
            field.submitAction = () => { searchSubmits += 1; };
        });
        const searchInput = search.root.querySelector('input') as HTMLInputElement;
        searchInput.dispatchEvent(new (doc.defaultView as any).Event('compositionstart', { bubbles: true }));
        searchInput.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(searchSubmits).toEqual(0);
        searchInput.dispatchEvent(new (doc.defaultView as any).Event('compositionend', { bubbles: true }));
        searchInput.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(searchSubmits).toEqual(1);
    }

    @Test('text/search fields and field groups use the same ids and describedby order')
    async sharedContract() {
        const text = await this.mount<TextFieldComponent>(TextFieldComponent, field => {
            field.inputId = 'name-field';
            field.label = 'Name';
            field.hint = 'Hint';
            field.error = 'Required';
        });
        const textInput = text.root.querySelector('input') as HTMLInputElement;
        expect(textInput.id).toEqual('name-field');
        expect(textInput.getAttribute('aria-describedby')).toEqual('name-field-hint name-field-error');
        expect(textInput.getAttribute('aria-invalid')).toEqual('true');
        expect(text.root.querySelector('.ui-field-hint')?.id).toEqual('name-field-hint');
        expect(text.root.querySelector('.ui-field-error')?.id).toEqual('name-field-error');

        const search = await this.mount<SearchFieldComponent>(SearchFieldComponent, field => {
            field.inputId = 'find-field';
            field.label = 'Find';
            field.hint = 'Hint';
            field.error = 'Bad';
        });
        const searchInput = search.root.querySelector('input') as HTMLInputElement;
        expect(searchInput.getAttribute('aria-describedby')).toEqual('find-field-hint find-field-error');

        const group = await this.mount<FieldComponent>(FieldComponent, field => {
            field.controlId = 'token-field';
            field.hint = 'Hint';
            field.error = 'Required';
        });
        const groupRoot = group.root.matches?.('.ui-field-group')
            ? group.root
            : group.root.querySelector('.ui-field-group') as HTMLElement;
        expect(groupRoot.getAttribute('aria-describedby')).toEqual('token-field-hint token-field-error');
        expect(groupRoot.getAttribute('data-invalid')).toEqual('false');
    }
}
