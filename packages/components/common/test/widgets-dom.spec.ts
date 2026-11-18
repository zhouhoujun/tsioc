import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ListComponent, ListModule } from '../list';
import { SelectComponent, SelectModule } from '../select';
import { ToastStackComponent, ToastModule } from '../toast';
import { ToastEntry } from '../toast';

@Component({
    selector: 'common-widgets-host',
    imports: [ListComponent, SelectComponent, ToastStackComponent],
    template: `
    <list :items="rows" :emptyLabel="emptyLabel" :selectValueAction="selectRow"></list>
    <list :items="rows" :visibleItems="1" showScrollbar></list>
    <select-list :options="options" :selectedIndex="1" :visibleCount="2"
        ariaLabel="Picker" :fitContent="true"></select-list>
    <toast-stack :items="toasts" :messageWidth="18"></toast-stack>`
})
class CommonWidgetsHostComponent {
    emptyLabel = 'Nothing here';
    rows = [
        { id: 'a', label: 'Alpha', value: 'a' },
        { id: 'b', label: 'Beta', value: 'b' }
    ];
    options = [
        { label: 'One', value: '1' },
        { label: 'Two', value: '2', description: 'second' },
        { label: 'Three', value: '3' }
    ];
    toasts: ToastEntry[] = [
        { id: 't1', message: 'Copied', tone: 'success', createdAt: 1 }
    ];
    selected: string[] = [];
    selectRow = (value: string) => this.selected.push(value);
}

@Suite('common widgets DOM')
export class CommonWidgetsDomTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(CommonWidgetsHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ListModule, SelectModule, ToastModule],
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

    protected async mount(): Promise<ComponentRef<CommonWidgetsHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(CommonWidgetsHostComponent, {
            injector: this.ctx
        }) as ComponentRef<CommonWidgetsHostComponent>;
        await ref.render();
        await Promise.resolve();
        return ref;
    }

    @Test('renders list rows and forwards row values through the shared shell')
    async listRows() {
        const ref = await this.mount();
        const host = ref.instance as CommonWidgetsHostComponent;
        const root = ref.hostView.rootNodes[0] as HTMLElement;

        const listBox = root.querySelector('.list') as HTMLElement;
        expect(listBox.style.maxHeight).toEqual('60vh');
        expect(listBox.style.overflowY).toEqual('auto');
        expect(root.querySelector('.list-empty')).toBeTruthy();
        expect(root.textContent).toContain('Alpha');
        (root.querySelectorAll('.list-row')[1] as HTMLElement).click();
        expect(host.selected).toEqual(['b']);

        host.rows = [{ id: 'c', label: 'Gamma', value: 'c' }];
        await Promise.resolve();
        await Promise.resolve();
        expect(root.textContent).toContain('Gamma');
        expect(root.textContent).not.toContain('Alpha');
    }

    @Test('renders a scrollbar when a list is windowed')
    async listScrollbar() {
        const ref = await this.mount();
        const lists = ref.hostView.queryAll(ListComponent) as ComponentRef<ListComponent>[];
        const root = lists[1].hostView.rootNodes[0] as HTMLElement;
        expect(root.querySelector('.ui-scrollbar')).toBeTruthy();
        expect(root.querySelectorAll('.ui-scrollbar-thumb').length).toBeGreaterThan(0);
    }

    @Test('exposes the normalized aria label and windows select rows')
    async selectShell() {
        const ref = await this.mount();
        const select = ref.hostView.query(SelectComponent) as ComponentRef<SelectComponent>;
        const root = select.hostView.rootNodes[0] as HTMLElement;

        expect(select.instance.ariaLabel).toEqual('Picker');
        expect(select.instance.accessibilityLabel).toEqual('Picker');
        expect(select.instance.widthClass).toEqual('dialog-w-28');
        const rows = select.hostView.rootNodes[0].querySelector('.select-rows') as HTMLElement;
        expect(rows.style.maxHeight).toEqual('60vh');
        expect(rows.style.overflowY).toEqual('auto');
        expect(root.textContent).toContain('Two');
        // visibleCount=2 around index 1 still shows the selected row only once.
        expect(root.querySelectorAll('.select-option')).toHaveLength(2);
    }

    @Test('pads toast rows to the requested card width')
    async toastRows() {
        const ref = await this.mount();
        const stack = ref.hostView.query(ToastStackComponent) as ComponentRef<ToastStackComponent>;
        const root = stack.hostView.rootNodes[0] as HTMLElement;

        expect(stack.instance.rows.map(row => row.text)).toEqual(['Copied          ']);
        expect(root.textContent).toContain('Copied');
        expect(root.textContent).toContain('✕');
    }
}
