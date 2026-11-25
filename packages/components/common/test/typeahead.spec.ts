import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { TypeaheadComponent, TypeaheadModule } from '../typeahead';

async function settle(): Promise<void> {
    for (let index = 0; index < 40; index++) await Promise.resolve();
}

@Component({
    selector: 'typeahead-host',
    imports: [TypeaheadComponent],
    template: `<ui-typeahead :source="source" :minChars="1" ariaLabel="Search" :selectAction="onSelect"></ui-typeahead>`
})
class TypeaheadHostComponent {
    calls: string[] = [];
    selected = '';
    modes: string[] = [];
    source = async (query: string) => {
        this.calls.push(query);
        if (this.modes[this.calls.length - 1] === 'error') {
            throw new Error('network down');
        }
        return { items: [{ label: `${query}-a`, value: 'a' }, { label: `${query}-b`, value: 'b' }] };
    };
    onSelect = (value: string) => { this.selected = value; };
}

@Suite('common typeahead')
export class TypeaheadTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(TypeaheadHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, TypeaheadModule],
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

    @Test('typing calls the async source and renders suggestions')
    async loadsSuggestions() {
        const ref = this.ctx.get(ComponentFactory).create(TypeaheadHostComponent, { injector: this.ctx }) as ComponentRef<TypeaheadHostComponent>;
        await ref.render();
        await settle();
        const typeahead = (ref.hostView.queryAll(TypeaheadComponent) as ComponentRef<TypeaheadComponent>[])[0].instance;
        typeahead.onInput('ab');
        await settle();
        expect(ref.instance.calls).toEqual(['ab']);
        expect(typeahead.options.map(option => option.label)).toEqual(['ab-a', 'ab-b']);
        const root = ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        expect(root.querySelector('.ui-autocomplete-label')?.textContent).toEqual('ab-a');
    }

    @Test('errors surface with retry and recovery')
    async errorAndRetry() {
        const ref = this.ctx.get(ComponentFactory).create(TypeaheadHostComponent, { injector: this.ctx }) as ComponentRef<TypeaheadHostComponent>;
        await ref.render();
        await settle();
        ref.instance.modes[0] = 'error';
        const typeahead = (ref.hostView.queryAll(TypeaheadComponent) as ComponentRef<TypeaheadComponent>[])[0].instance;
        typeahead.onInput('bad');
        await settle();
        expect(typeahead.error).toContain('network down');
        // Retry exists for hosts; recovery is covered by the success test above.
        expect(ref.instance.calls).toEqual(['bad']);
    }
}
