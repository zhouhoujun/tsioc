import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SearchListComponent, SearchListItem, SearchListModule } from '../search-list';

async function settle(): Promise<void> {
    for (let index = 0; index < 40; index++) await Promise.resolve();
}

@Component({
    selector: 'search-list-host',
    imports: [SearchListComponent],
    template: `<ui-search-list :items="items" :recentIds="recentIds"
        :selectAction="onSelect" :closeAction="onClose" :changeAction="onChange"></ui-search-list>`
})
class SearchListHostComponent {
    items: SearchListItem[] = [
        { id: 'deploy', label: 'Deploy', group: 'Run', shortcut: 'Ctrl+D' },
        { id: 'delete', label: 'Delete session', group: 'Session' },
        { id: 'settings', label: 'Settings', group: 'App', disabled: true }
    ];
    recentIds = ['deploy'];
    selected = '';
    closed = 0;
    changed = '';
    source?: (query: string, signal: AbortSignal) => Promise<any>;
    onSelect = (item: SearchListItem) => { this.selected = item.id; };
    onClose = () => { this.closed += 1; };
    onChange = (query: string) => { this.changed = query; };
}

@Suite('common search-list')
export class SearchListTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SearchListHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, SearchListModule],
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

    private async mount(): Promise<{ host: SearchListHostComponent; list: SearchListComponent; root: HTMLElement; rootNow: () => HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(SearchListHostComponent, { injector: this.ctx }) as ComponentRef<SearchListHostComponent>;
        await ref.render();
        await settle();
        const list = (ref.hostView.queryAll(SearchListComponent) as ComponentRef<SearchListComponent>[])[0].instance;
        const rootNow = () => ref.hostView.rootNodes.find((node: any) => typeof node.querySelector === 'function') as HTMLElement;
        return { host: ref.instance, list, root: rootNow(), rootNow };
    }

    @Test('filters locally, keeps recent items first and moves the active row')
    async filtersAndNavigates() {
        const { host, list, root } = await this.mount();
        expect(list.rows[0].label).toEqual('Recent');
        expect(list.optionRows.map(item => item.id)).toEqual(['deploy', 'delete', 'settings']);

        list.setQuery('de');
        expect(host.changed).toEqual('de');
        expect(list.optionRows.map(item => item.id)).toEqual(['deploy', 'delete']);
        list.onKeydown({ key: 'ArrowDown', preventDefault() { } });
        expect(list.activeItem?.id).toEqual('delete');
        list.onKeydown({ key: 'Enter', preventDefault() { } });
        expect(host.selected).toEqual('delete');
        expect(root.querySelector('.ui-search-list-input')).toBeTruthy();
        expect(root.querySelector('[data-item-id="deploy"]')).toBeTruthy();
        expect(root.textContent).toContain('Ctrl+D');
    }

    @Test('Home and End land on enabled rows')
    async homeAndEnd() {
        const { list } = await this.mount();
        list.onKeydown({ key: 'End', preventDefault() { } });
        expect(list.activeItem?.id).toEqual('delete');
        list.onKeydown({ key: 'Home', preventDefault() { } });
        expect(list.activeItem?.id).toEqual('deploy');
        list.setQuery('sett');
        expect(list.optionRows.map(item => item.id)).toEqual(['settings']);
        list.onKeydown({ key: 'Enter', preventDefault() { } });
        expect(list.activeId).toEqual('');
    }

    @Test('controlled mode hides the input and follows the host selection')
    async controlledMode() {
        const { list, rootNow } = await this.mount();
        list.showInput = false;
        list.selectedId = 'delete';
        await settle();
        expect(rootNow().querySelector('.ui-search-list-input')).toBeFalsy();
        expect(list.activeId).toEqual('delete');
        expect(list.rows.find(row => row.kind === 'option' && row.item?.id === 'delete')?.active).toEqual(true);
        list.selectedId = 'missing';
        expect(list.activeId).toEqual('deploy');
        list.showInput = true;
        await settle();
        expect(rootNow().querySelector('.ui-search-list-input')).toBeTruthy();
    }

    @Test('Escape closes and disabled rows are skipped')
    async closesAndSkipsDisabled() {
        const { host, list } = await this.mount();
        list.move(1);
        expect(list.activeItem?.id).toEqual('delete');
        list.onKeydown({ key: 'Escape', preventDefault() { } });
        expect(host.closed).toEqual(1);
    }

    @Test('async sources abort stale requests, surface errors and retry')
    async asyncSource() {
        const { host, list } = await this.mount();
        const pending: Array<{ query: string; signal: AbortSignal; resolve: (result: any) => void }> = [];
        host.source = ((query: string, signal: AbortSignal) => new Promise(resolve => {
            pending.push({ query, signal, resolve });
        })) as any;
        list.source = host.source;
        list.setQuery('ab');
        list.setQuery('abc');
        expect(pending.map(entry => entry.query)).toEqual(['ab', 'abc']);
        expect(pending[0].signal.aborted).toEqual(true);
        pending[1].resolve({ items: [{ id: 'abc', label: 'abc' }] });
        await settle();
        expect(list.loadingState).toEqual(false);
        expect(list.optionRows.map(item => item.id)).toEqual(['abc']);

        host.source = (async () => { throw new Error('backend down'); }) as any;
        list.source = host.source;
        list.setQuery('fail');
        await settle();
        expect(list.error).toContain('backend down');

        host.source = (async () => ({ items: [{ id: 'fail', label: 'fail recovered' }] })) as any;
        list.source = host.source;
        list.retry();
        await settle();
        expect(list.error).toEqual('');
        expect(list.optionRows.map(item => item.id)).toEqual(['fail']);
    }
}
