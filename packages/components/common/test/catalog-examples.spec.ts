import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { CATALOG_OVERRIDES } from '../catalog/overrides';
import { DialogComponent, DialogModule } from '../dialog';
import { SelectComponent, SelectModule } from '../select';
import { AutoCompleteComponent, AutoCompleteModule } from '../autocomplete';
import { DataTableComponent, DataTableModule } from '../data-table';
import { DynamicFormComponent, DynamicFormModule } from '../dynamic-form';
import { TypeaheadComponent, TypeaheadModule } from '../typeahead';
import { SearchListComponent, SearchListModule } from '../search-list';
import { CommandPaletteComponent, CommandPaletteModule } from '../command-palette';
import { InlineInputComponent, InlineInputModule } from '../inline-input';

@Suite('common catalog examples render')
export class CatalogExamplesTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DialogModule, {
            deps: [HtmlTemplateModule, ComponentsModule, SelectModule, DataTableModule, DynamicFormModule, TypeaheadModule, SearchListModule, CommandPaletteModule, AutoCompleteModule, InlineInputModule],
            providers: [{ provide: DOCUMENT, useFactory: () => {
                const { JSDOM } = require('jsdom');
                return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
            } }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    private async render<T>(type: any): Promise<{ ref: ComponentRef<T>; root: HTMLElement; markup: string }> {
        const ref = this.ctx.get(ComponentFactory).create(type, { injector: this.ctx }) as ComponentRef<T>;
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        return { ref, root, markup: root.innerHTML };
    }

    @Test('dialog example renders its shell and hint')
    async dialogExample() {
        const { ref, root } = await this.render<DialogComponent>(DialogComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES.dialog?.examples?.[0]?.props ?? {});
        await ref.render();
        await Promise.resolve();
        const current = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        expect(current.matches('.dialog-panel')).toBeTruthy();
        expect(current.textContent).toContain('Delete file?');
        expect(current.textContent).toContain('Enter confirm');
    }

    @Test('select example renders options')
    async selectExample() {
        const { ref, root } = await this.render<SelectComponent>(SelectComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES.select?.examples?.[0]?.props ?? {});
        await ref.render();
        expect(root.querySelector('.ui-select, .select-list, .select-rows, select')).toBeTruthy();
        expect(root.textContent).toContain('ask');
        expect(root.textContent).toContain('auto');
    }

    @Test('data-table example renders the header/row')
    async tableExample() {
        const { ref, root } = await this.render<DataTableComponent>(DataTableComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES['data-table']?.examples?.[0]?.props ?? {});
        await ref.render();
        expect(root.textContent).toContain('Runs');
        expect(root.textContent).toContain('build');
    }

    @Test('autocomplete examples render searchable and multi variants')
    async autocompleteExamples() {
        const { ref } = await this.render<AutoCompleteComponent>(AutoCompleteComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES.autocomplete?.examples?.[0]?.props ?? {});
        await ref.render();
        await Promise.resolve();
        const input = (ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement)
            .querySelector('.ui-autocomplete-input') as HTMLInputElement;
        expect(input).toBeTruthy();

        Object.assign(ref.instance, CATALOG_OVERRIDES.autocomplete?.examples?.[1]?.props ?? {});
        await ref.render();
        await Promise.resolve();
        expect(ref.instance.multiple).toBe(true);
        expect(ref.instance.selectedItems.length).toBe(1);
    }

    @Test('list rows can use a whole-row widget and built-in copy action')
    async rowEditor() {
        const { ref } = await this.render<DynamicFormComponent>(DynamicFormComponent);
        ref.instance.schema = {
            fields: [{
                key: 'rows',
                type: 'list',
                label: 'Rows',
                rowEditor: 'inline',
                rowActions: [{ id: 'copy', label: 'Copy', title: 'Duplicate row' }],
                itemFields: []
            }],
            widgets: [{ type: 'inline', component: InlineInputComponent }]
        };
        ref.instance.value = { rows: ['alpha', 'beta'] };
        await ref.render();
        await Promise.resolve();
        const current = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;

        const values = current.querySelectorAll('.df-list-row .ui-inline-input-value');
        expect(values.length).toBe(2);
        expect(values[0].textContent).toContain('alpha');
        expect(current.querySelectorAll('.df-list-row .df-list-fields').length).toBe(0);

        // Copy duplicates the row through the immutable writer.
        (current.querySelector('.df-list-row [data-list-action="copy"]') as any).click();
        await ref.render();
        await Promise.resolve();
        expect(ref.instance.getValue().rows).toEqual(['alpha', 'alpha', 'beta']);

        // Editing through the row widget writes the whole row back.
        const live = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        (live.querySelector('.df-list-row .ui-inline-input-value') as any).click();
        await Promise.resolve();
        const input = live.querySelector('.df-list-row .ui-inline-input-field') as any;
        expect(input).toBeTruthy();
        input.value = 'gamma';
        input.dispatchEvent(new (live.ownerDocument.defaultView as any).Event('input', { bubbles: true }));
        input.dispatchEvent(new (live.ownerDocument.defaultView as any).KeyboardEvent('keydown', {
            key: 'Enter', bubbles: true
        }));
        await Promise.resolve();
        expect(ref.instance.getValue().rows).toEqual(['gamma', 'alpha', 'beta']);
    }

    @Test('dynamic-form example renders fields')
    async formExample() {
        const { ref, root } = await this.render<DynamicFormComponent>(DynamicFormComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES['dynamic-form']?.examples?.[0]?.props ?? {});
        await ref.render();
        expect(root.textContent).toContain('Name');
        expect(root.textContent).toContain('Enabled');
    }

    @Test('search-list example renders grouped options and shortcuts')
    async searchListExample() {
        const { ref, root } = await this.render<SearchListComponent>(SearchListComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES['search-list']?.examples?.[0]?.props ?? {});
        await ref.render();
        await Promise.resolve();
        const current = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        expect(current.querySelector('.ui-search-list-input')).toBeTruthy();
        expect(current.textContent).toContain('Deploy');
        expect(current.textContent).toContain('Ctrl+D');
        expect(current.textContent).toContain('Recent');
    }

    @Test('command palette example renders its overlay and commands')
    async commandPaletteExample() {
        const { ref, root } = await this.render<CommandPaletteComponent>(CommandPaletteComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES['command-palette']?.examples?.[0]?.props ?? {});
        await ref.render();
        await Promise.resolve();
        const current = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        expect(current.querySelector('.ui-command-palette-panel')).toBeTruthy();
        expect(current.textContent).toContain('Command palette');
        expect(current.textContent).toContain('Deploy');
        expect(root).toBeTruthy();
    }

    @Test('typeahead example renders its input shell')
    async typeaheadExample() {
        const { ref, root } = await this.render<TypeaheadComponent>(TypeaheadComponent);
        Object.assign(ref.instance, CATALOG_OVERRIDES.typeahead?.examples?.[0]?.props ?? {});
        await ref.render();
        await Promise.resolve();
        const current = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        expect(current.matches('.ui-typeahead')).toBeTruthy();
        expect(current.querySelector('.ui-autocomplete-input')).toBeTruthy();
    }
}
