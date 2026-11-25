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

@Suite('common catalog examples render')
export class CatalogExamplesTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(DialogModule, {
            deps: [HtmlTemplateModule, ComponentsModule, SelectModule, DataTableModule, DynamicFormModule, TypeaheadModule],
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
