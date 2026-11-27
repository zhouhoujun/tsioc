import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { SearchListComponent, SearchListItem, SearchListModule } from '../search-list';
import { AutoCompleteComponent, AutoCompleteModule } from '../autocomplete';
import { CascaderComponent, CascaderModule } from '../cascader';
import { TreeSelectComponent, TreeSelectModule } from '../tree-select';
import { SelectComponent, SelectModule } from '../select';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'selection-parity-host',
    imports: [SearchListComponent, AutoCompleteComponent, CascaderComponent, TreeSelectComponent, SelectComponent],
    template: `
    <ui-search-list :items="searchItems" :selectAction="onSearch" :closeAction="onSearchClose"></ui-search-list>
    <ui-autocomplete :options="autoOptions" :selectAction="onAuto" :value="autoValue"></ui-autocomplete>
    <ui-cascader :options="cascadeOptions" :changeAction="onCascade"></ui-cascader>
    <ui-tree-select :items="treeItems" :changeAction="onTree"></ui-tree-select>
    <select-list :options="selectOptions" :selectedIndex="0"
        :selectAction="onSelect" :closeAction="onSelectClose"></select-list>`
})
class SelectionParityHostComponent {
    searchPicked = '';
    searchClosed = 0;
    autoPicked = '';
    cascadePicked: string[] = [];
    treePicked = '';
    selectPicked = '';
    selectClosed = 0;
    autoValue = '';

    searchItems: SearchListItem[] = [
        { id: 'alpha', label: 'Alpha' },
        { id: 'beta', label: 'Beta', disabled: true },
        { id: 'gamma', label: 'Gamma' }
    ];
    autoOptions = [
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta', disabled: true },
        { label: 'Gamma', value: 'gamma' }
    ];
    cascadeOptions = [
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta', disabled: true },
        { label: 'Gamma', value: 'gamma' }
    ];
    treeItems = [
        { id: 'alpha', label: 'Alpha' },
        { id: 'beta', label: 'Beta', disabled: true },
        { id: 'gamma', label: 'Gamma' }
    ];
    selectOptions = [
        { label: 'Alpha', value: 'alpha' },
        { label: 'Beta', value: 'beta', disabled: true },
        { label: 'Gamma', value: 'gamma' }
    ];

    onSearch = (item: SearchListItem) => { this.searchPicked = item.id; };
    onSearchClose = () => { this.searchClosed += 1; };
    onAuto = (value: string) => { this.autoPicked = value; };
    onCascade = (path: string[]) => { this.cascadePicked = path; };
    onTree = (node: any) => { this.treePicked = node.id; };
    onSelect = (value: string) => { this.selectPicked = value; };
    onSelectClose = () => { this.selectClosed += 1; };
}

interface SelectionAdapter {
    name: string;
    open(): void;
    press(key: string): void;
    active(): string;
    isOpen(): boolean;
    closedByHost(): boolean;
}

@Suite('common selection keyboard parity')
export class SelectionParityTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(SelectionParityHostComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule,
                SearchListModule,
                AutoCompleteModule,
                CascaderModule,
                TreeSelectModule,
                SelectModule
            ],
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

    protected async mount(): Promise<{ host: SelectionParityHostComponent; adapters: SelectionAdapter[]; root: HTMLElement }> {
        const ref = this.ctx.get(ComponentFactory).create(SelectionParityHostComponent, {
            injector: this.ctx
        }) as ComponentRef<SelectionParityHostComponent>;
        await ref.render();
        const host = ref.instance as SelectionParityHostComponent;
        const all = <T>(type: any): T => (ref.hostView.query(type) as ComponentRef<T>).instance;
        const search = all<SearchListComponent>(SearchListComponent);
        const auto = all<AutoCompleteComponent>(AutoCompleteComponent);
        const cascade = all<CascaderComponent>(CascaderComponent);
        const tree = all<TreeSelectComponent>(TreeSelectComponent);
        const select = all<SelectComponent>(SelectComponent);
        for (let index = 0; index < 8; index++) await Promise.resolve();

        return {
            host,
            adapters: [
                {
                    name: 'search-list',
                    open() { },
                    press(key) { search.onKeydown({ key, preventDefault() { } }); },
                    active() { return String(search.activeItem?.id || ''); },
                    isOpen() { return true; },
                    closedByHost() { return host.searchClosed > 0; }
                },
                {
                    name: 'autocomplete',
                    open() { auto.open = true; },
                    press(key) { auto.onKeydown({ key, preventDefault() { } }); },
                    active() { return auto.viewOptions[auto.currentIndex]?.value || ''; },
                    isOpen() { return auto.openState; },
                    closedByHost() { return !auto.openState; }
                },
                {
                    name: 'cascader',
                    open() { cascade.open(); },
                    press(key) { cascade.onKeydown({ key, preventDefault() { } }); },
                    active() { return (cascade as any).activeValueAt((cascade as any).activeLevel()) || ''; },
                    isOpen() { return cascade.openState; },
                    closedByHost() { return !cascade.openState; }
                },
                {
                    name: 'tree-select',
                    open() { tree.open(); },
                    press(key) { tree.onKeydown({ key, preventDefault() { } }); },
                    active() { return String((tree as any).tree?.activeRow()?.key || ''); },
                    isOpen() { return tree.openState; },
                    closedByHost() { return !tree.openState; }
                },
                {
                    name: 'select',
                    open() { },
                    press(key) { select.onListboxKeydown({ key, preventDefault() { } }); },
                    active() { return select.options[select.activeIndex]?.value || ''; },
                    isOpen() { return true; },
                    closedByHost() { return host.selectClosed > 0; }
                }
            ],
            root: ref.hostView.rootNodes[0] as HTMLElement
        };
    }

    @Test('selection widgets pass the shared accessibility audit')
    async a11y() {
        const { root } = await this.mount();
        expect(formatViolations(auditA11y(root, this.ctx.get(DOCUMENT)))).toEqual('');
    }

    @Test('select close, chip removal and clear are keyboard operable')
    async selectKeyboardAffordances() {
        const select = new SelectComponent();
        const actions: string[] = [];
        select.values = ['alpha', 'beta'];
        select.removeAction = value => actions.push(`remove:${value}`);
        select.valuesAction = values => actions.push(`values:${values.join(',')}`);
        select.closeAction = () => actions.push('close');

        select.removeValueKeydown('alpha', { key: 'Enter', preventDefault() { } });
        expect(select.values).toEqual(['beta']);
        select.clearValuesKeydown({ key: ' ' });
        expect(select.values).toEqual([]);
        select.closeKeydown({ key: 'Enter' });
        expect(actions).toEqual(['remove:alpha', 'values:beta', 'values:', 'close']);

        select.removeValueKeydown('beta', { key: 'Tab', preventDefault() { } });
        expect(actions.length).toEqual(4);
    }

    @Test('Home/End, wrapped arrows and Enter behave the same across selection widgets')
    async sharedKeyMatrix() {
        const { host, adapters } = await this.mount();
        adapters.forEach(adapter => adapter.open());
        for (let index = 0; index < 8; index++) await Promise.resolve();

        adapters.forEach(adapter => adapter.press('End'));
        expect(adapters.map(adapter => adapter.active())).toEqual(['gamma', 'gamma', 'gamma', 'gamma', 'gamma']);

        adapters.forEach(adapter => adapter.press('ArrowDown'));
        expect(adapters.map(adapter => adapter.active())).toEqual(['alpha', 'alpha', 'alpha', 'alpha', 'alpha']);

        adapters.forEach(adapter => adapter.press('ArrowUp'));
        expect(adapters.map(adapter => adapter.active())).toEqual(['gamma', 'gamma', 'gamma', 'gamma', 'gamma']);

        adapters.forEach(adapter => adapter.press('Home'));
        expect(adapters.map(adapter => adapter.active())).toEqual(['alpha', 'alpha', 'alpha', 'alpha', 'alpha']);

        adapters.forEach(adapter => adapter.press('Enter'));
        for (let index = 0; index < 8; index++) await Promise.resolve();
        expect(host.searchPicked).toEqual('alpha');
        expect(host.autoPicked).toEqual('alpha');
        expect(host.cascadePicked).toEqual(['alpha']);
        expect(host.treePicked).toEqual('alpha');
        expect(host.selectPicked).toEqual('alpha');

        adapters.forEach(adapter => adapter.press('Escape'));
        for (let index = 0; index < 4; index++) await Promise.resolve();
        expect(host.searchClosed).toEqual(1);
        expect(host.selectClosed).toEqual(1);
        expect(adapters.slice(1, 4).every(adapter => adapter.closedByHost())).toEqual(true);
    }
}
