import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ListComponent, ListModule } from '../list';
import { SelectComponent, SelectModule } from '../select';
import { ToastStackComponent, ToastModule, ToastService } from '../toast';
import { ToastEntry } from '../toast';

@Component({
    selector: 'common-widgets-host',
    imports: [ListComponent, SelectComponent, ToastStackComponent],
    template: `
    <list :items="rows" :emptyLabel="emptyLabel" :selectValueAction="selectRow"></list>
    <list :items="rows" :visibleItems="1" showScrollbar></list>
    <select-list :options="options" :selectedIndex="1" :visibleCount="2"
        ariaLabel="Picker" title="Options" hint="Choose one"
        :fitContent="true" :emptyText="emptyLabel"></select-list>
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

/**
 * Hosts may bind the queue directly. Reading the injected service inside a
 * template effect uses the `subscribe` contract of the proxy layer, so new
 * entries paint without any host-side copy or manual refresh.
 */
@Component({
    selector: 'reactive-toast-host',
    imports: [ToastStackComponent],
    template: `<toast-stack :items="toastService.current" :messageWidth="18"
        :closeAction="closeToast"></toast-stack>`
})
class ReactiveToastHostComponent {
    readonly closeToast = (id: string): void => this.toastService.dismiss(id);

    constructor(public readonly toastService: ToastService) { }
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

    @Test('exposes list busy and error live states')
    async listStates() {
        const ref = await this.mount();
        const lists = ref.hostView.queryAll(ListComponent) as ComponentRef<ListComponent>[];
        const list = lists[0];
        const root = list.hostView.rootNodes[0] as HTMLElement;
        const box = root.querySelector('.list') as HTMLElement;

        expect(box.getAttribute('role')).toEqual('listbox');
        expect(box.getAttribute('aria-label')).toEqual('List');
        expect(box.getAttribute('aria-busy')).toEqual('false');

        list.instance.loading = true;
        list.instance.error = 'Failed to load';
        await Promise.resolve();
        await Promise.resolve();

        expect(box.getAttribute('aria-busy')).toEqual('true');
        expect(root.querySelector('.list-loading')?.textContent).toContain('Loading');
        expect(root.querySelector('.list-error')?.getAttribute('role')).toEqual('alert');
        expect(root.querySelector('.list-error')?.textContent).toContain('Failed to load');
    }

    @Test('renders a scrollbar when a list is windowed')
    async listScrollbar() {        const ref = await this.mount();
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
        // Header/footer sit outside the scrolling rows.
        expect(rows.querySelector('.select-title')).toBeFalsy();
        expect(rows.querySelector('.select-hint')).toBeFalsy();
        expect(root.querySelector('.select-title')?.textContent).toContain('Options');
        expect(root.querySelector('.select-hint')?.textContent).toContain('Choose one');
        expect(root.textContent).toContain('Two');
        // visibleCount=2 around index 1 still shows the selected row only once.
        expect(root.querySelectorAll('.select-option')).toHaveLength(2);
    }

    @Test('renders the live-filter empty state when no rows match')
    async selectEmptyState() {
        const ref = await this.mount();
        const host = ref.instance as CommonWidgetsHostComponent;
        host.options = [];
        await Promise.resolve();
        await Promise.resolve();
        const select = ref.hostView.query(SelectComponent) as ComponentRef<SelectComponent>;
        const root = select.hostView.rootNodes[0] as HTMLElement;
        expect(root.querySelector('.select-empty')?.textContent).toContain('Nothing here');
        expect(root.querySelectorAll('.select-option')).toHaveLength(0);
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

    @Test('the shared toast queue paints through the reactive subscribe contract')
    async reactiveToastQueue() {
        const ref = this.ctx.get(ComponentFactory).create(ReactiveToastHostComponent, {
            injector: this.ctx
        }) as ComponentRef<ReactiveToastHostComponent>;
        await ref.render();
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        const host = ref.instance;

        host.toastService.show('Saved', { durationMs: 0, tone: 'success' });
        await Promise.resolve();
        await Promise.resolve();
        expect(root.textContent).toContain('Saved');
        expect(root.querySelector('.console-toast[data-tone="success"]')).toBeTruthy();

        const id = host.toastService.current[0].id;
        (root.querySelector('.toast-close') as HTMLElement).click();
        await Promise.resolve();
        await Promise.resolve();
        expect(host.toastService.current).toEqual([]);
        expect(root.textContent).not.toContain('Saved');
        expect(id).toBeTruthy();
    }
}
