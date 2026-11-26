import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AutoCompleteComponent, AutoCompleteModule } from '../autocomplete';

@Component({
    selector: 'autocomplete-host',
    imports: [AutoCompleteComponent],
    template: `<ui-autocomplete :options="options" :value="query" ariaLabel="Search"
        :changeAction="onInput" :selectAction="onSelect"></ui-autocomplete>`
})
class AutoCompleteHostComponent {
    query = '';
    selected = '';
    options = [
        { label: 'Alpha', value: 'a' },
        { label: 'Beta', value: 'b' },
        { label: 'Delta', value: 'd', disabled: true }
    ];
    onInput = (value: string) => { this.query = value; };
    onSelect = (value: string) => { this.selected = value; };
}

@Suite('common autocomplete')
export class AutoCompleteTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AutoCompleteHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, AutoCompleteModule],
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

    protected async mount(): Promise<{ root: HTMLElement; host: AutoCompleteHostComponent; component: ComponentRef<AutoCompleteComponent> }> {
        const ref = this.ctx.get(ComponentFactory).create(AutoCompleteHostComponent, {
            injector: this.ctx
        }) as ComponentRef<AutoCompleteHostComponent>;
        await ref.render();
        await Promise.resolve();
        const component = ref.hostView.query(AutoCompleteComponent) as ComponentRef<AutoCompleteComponent>;
        return { root: component.hostView.rootNodes[0] as HTMLElement, host: ref.instance as AutoCompleteHostComponent, component };
    }

    @Test('filters, roves options and selects with the keyboard')
    async keyboardSelection() {
        const { root, host } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const input = root.querySelector('.ui-autocomplete-input') as HTMLInputElement;
        const options = () => Array.from(root.querySelectorAll('.ui-autocomplete-option') as NodeListOf<HTMLElement>);

        expect(input.getAttribute('role')).toEqual('combobox');
        expect(input.getAttribute('aria-label')).toEqual('Search');
        input.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        await Promise.resolve();
        expect(input.getAttribute('aria-expanded')).toEqual('true');
        expect(root.querySelector('.ui-autocomplete-panel')?.getAttribute('role')).toEqual('listbox');
        expect(options().length).toEqual(3);
        expect(options()[0].getAttribute('aria-selected')).toEqual('true');

        input.value = 'a';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await Promise.resolve();
        expect(host.query).toEqual('a');

        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        await Promise.resolve();
        expect(options()[1].getAttribute('aria-selected')).toEqual('true');
        expect(input.getAttribute('aria-activedescendant')).toEqual(options()[1].id);

        // Delta is disabled, so the next ArrowDown wraps to Alpha.
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        await Promise.resolve();
        expect(options()[2].getAttribute('aria-selected')).toEqual('false');

        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await Promise.resolve();
        expect(host.selected).toEqual('a');
        expect(input.value).toEqual('a');
        expect(root.querySelector('.ui-autocomplete-panel')).toBeFalsy();
    }

    @Test('renders group headers without breaking keyboard selection')
    async groupedOptions() {
        const { root, host, component } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const input = root.querySelector('.ui-autocomplete-input') as HTMLInputElement;
        component.instance.options = [
            { label: 'Alpha', value: 'a', group: 'Letters' },
            { label: 'Beta', value: 'b', group: 'Letters' },
            { label: 'One', value: '1', group: 'Numbers' }
        ];
        await Promise.resolve();

        input.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        await Promise.resolve();
        const groups = Array.from(root.querySelectorAll('.ui-autocomplete-group'))
            .map(item => item.textContent);
        expect(groups).toEqual(['Letters', 'Numbers']);
        expect(root.querySelectorAll('.ui-autocomplete-option').length).toBe(3);

        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await Promise.resolve();
        expect(host.selected).toBe('b');
    }

    @Test('loads options asynchronously and ignores stale responses')
    async asyncOptions() {
        const { root, component } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const input = root.querySelector('.ui-autocomplete-input') as HTMLInputElement;
        let releaseA: ((options: any[]) => void) | undefined;
        component.instance.loadOptions = (query: string) => {
            if (query === 'a') {
                return new Promise(resolve => { releaseA = resolve; });
            }
            if (query === 'b') {
                return Promise.resolve([{ label: 'Bravo', value: 'b' }]);
            }
            return Promise.resolve([{ label: 'All', value: 'all' }]);
        };

        input.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        await Promise.resolve();
        await Promise.resolve();
        expect(root.querySelectorAll('.ui-autocomplete-option').length).toEqual(1);
        expect(root.textContent).toContain('All');

        input.value = 'a';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await Promise.resolve();
        expect(root.querySelector('.ui-autocomplete-loading')?.textContent).toContain('Loading');
        input.value = 'b';
        input.dispatchEvent(new (doc.defaultView as any).Event('input', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
        expect(root.textContent).toContain('Bravo');
        // A late response from the superseded query must not replace Bravo.
        releaseA?.([{ label: 'Stale A', value: 'a' }]);
        await Promise.resolve();
        await Promise.resolve();
        expect(root.textContent).toContain('Bravo');
        expect(root.textContent).not.toContain('Stale A');
    }

    @Test('Escape closes, clicks select and empty options are announced')
    async escapeClickAndEmpty() {
        const { root, host, component } = await this.mount();
        const doc = this.ctx.get(DOCUMENT) as Document;
        const input = root.querySelector('.ui-autocomplete-input') as HTMLInputElement;

        input.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        await Promise.resolve();
        input.dispatchEvent(new (doc.defaultView as any).KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await Promise.resolve();
        expect(input.getAttribute('aria-expanded')).toEqual('false');

        input.dispatchEvent(new (doc.defaultView as any).FocusEvent('focus'));
        await Promise.resolve();
        (root.querySelectorAll('.ui-autocomplete-option')[1] as HTMLElement).click();
        expect(host.selected).toEqual('b');

        host.options = [];
        (component.instance as any).open = true;
        await Promise.resolve();
        expect(root.querySelector('.ui-autocomplete-empty')?.textContent).toEqual('No suggestions');
        expect(component.instance.open).toEqual(true);
    }
}
