import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { CATALOG_OVERRIDES } from '../catalog/overrides';
import { DialogComponent, DialogModule } from '../dialog';
import { SelectComponent, SelectModule } from '../select';
import { DataTableComponent, DataTableModule } from '../data-table';
import { DynamicFormComponent, DynamicFormModule } from '../dynamic-form';
import { TypeaheadComponent, TypeaheadModule } from '../typeahead';
import { SearchListComponent, SearchListModule } from '../search-list';
import { CommandPaletteComponent, CommandPaletteModule } from '../command-palette';

@Suite('common catalog examples render')
export class CatalogExamplesTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DialogModule, {
            deps: [HtmlTemplateModule, ComponentsModule, SelectModule, DataTableModule, DynamicFormModule, TypeaheadModule, SearchListModule, CommandPaletteModule],
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
