import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { ButtonComponent, ButtonModule } from '../button';
import { CheckboxComponent, CheckboxModule } from '../checkbox';
import { TabsComponent, TabsModule } from '../tabs';
import { MenuBarComponent, MenuBarModule, MenuBarGroup } from '../menu-bar';
import { DataTableComponent, DataTableModule } from '../data-table';
import { ToastProviderComponent, ToastModule } from '../toast';
import { SelectComponent, SelectModule } from '../select';
import { DialogComponent, DialogModule } from '../dialog';
import { DrawerComponent, DrawerModule } from '../drawer';
import { SwitchComponent, SwitchModule } from '../switch';
import { SliderComponent, SliderModule } from '../slider';
import { ProgressComponent, ProgressModule } from '../progress';
import { PaginationComponent, PaginationModule } from '../pagination';
import { RateComponent, RateModule } from '../rate';
import { SegmentedComponent, SegmentedModule } from '../segmented';
import { UploadComponent, UploadModule } from '../upload';
import { BreadcrumbComponent, BreadcrumbModule } from '../breadcrumb';
import { ChipComponent, ChipModule } from '../chip';
import { TreeComponent, TreeModule } from '../tree';
import { auditA11y, formatViolations } from './support/a11y-audit';

const THEMES = ['light', 'dark', 'high-contrast'];

const groups: MenuBarGroup[] = [
    {
        items: [
            { id: 'run', label: 'Run' },
            {
                id: 'view', label: 'View', children: [
                    {
                        id: 'zoom', label: 'Zoom', children: [
                            { id: 'zoom:in', label: 'Zoom In' },
                            { id: 'zoom:out', label: 'Zoom Out' }
                        ]
                    }
                ]
            }
        ]
    }
];

function makeSource() {
    return {
        visible: true,
        showCreate: true,
        items: [
            { id: 'a', label: 'Alpha', active: true },
            { id: 'b', label: 'Beta' }
        ]
    };
}

@Component({
    selector: 'a11y-matrix-host',
    imports: [ButtonComponent, CheckboxComponent, TabsComponent, MenuBarComponent, DataTableComponent, ToastProviderComponent, SelectComponent, DialogComponent, DrawerComponent, SwitchComponent, SliderComponent, ProgressComponent, PaginationComponent, RateComponent, SegmentedComponent, UploadComponent, BreadcrumbComponent, ChipComponent, TreeComponent],
    template: `
    <div class="theme-sample">
        <ui-button label="Save"></ui-button>
        <ui-button label="Saving" loading="true" loadingLabel="Saving…"></ui-button>
        <ui-button label="Off" disabled="true"></ui-button>
        <ui-checkbox label="Accept" checked="true"></ui-checkbox>
        <tabs :source="tabsSource" activeId="a">
            <tab-pane data-tab-id="a">Alpha pane</tab-pane>
            <tab-pane data-tab-id="b">Beta pane</tab-pane>
        </tabs>
        <menu-bar label="Actions" :groups="menuGroups"></menu-bar>
        <ui-data-table ariaLabel="Rows" :columns="columns" :rows="rows"
            selectable="true" editable="true"></ui-data-table>
        <select-list title="Assignees" :options="selectOptions" :values="assignees"
            multiple searchable clearable></select-list>
        <ui-switch label="Notifications" checked="true"></ui-switch>
        <ui-slider label="Volume" value="40"></ui-slider>
        <ui-progress label="Upload" value="60"></ui-progress>
        <ui-pagination page="2" total="100" pageSize="10" showSizeChanger showQuickJumper></ui-pagination>
        <ui-rate value="3" ariaLabel="Rating"></ui-rate>
        <ui-segmented :options="segmentOptions" value="list" ariaLabel="View mode"></ui-segmented>
        <ui-upload label="Upload" hint="PNG or SVG" :files="uploadFiles"></ui-upload>
        <ui-breadcrumb :items="crumbs"></ui-breadcrumb>
        <ui-chip label="Feature" closable></ui-chip>
        <ui-tree :items="treeItems" checkable selectedId="child" ariaLabel="Files"></ui-tree>
        <dialog-panel title="Remove file?" ariaLabel="Remove file?"></dialog-panel>
        <ui-drawer title="Settings" ariaLabel="Settings"></ui-drawer>
        <ui-toast-provider></ui-toast-provider>
    </div>`
})
class A11yMatrixHostComponent {
    tabsSource = makeSource();
    menuGroups = groups;
    columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'role', label: 'Role' }
    ];
    rows = [
        { id: 'one', name: 'One', role: 'Owner' },
        { id: 'two', name: 'Two', role: 'Viewer' }
    ];
    selectOptions = [
        { label: 'Ada Lovelace', value: 'ada' },
        { label: 'Grace Hopper', value: 'grace' }
    ];
    assignees = ['ada'];
    segmentOptions = [
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' }
    ];
    uploadFiles = ['report.pdf', 'diagram.svg'];
    crumbs = [
        { label: 'Home', value: 'home' },
        { label: 'Projects', value: 'projects' },
        { label: 'Current', value: 'current' }
    ];
    treeItems = [
        {
            id: 'root', label: 'Workspace', children: [
                { id: 'child', label: 'src' },
                { id: 'docs', label: 'docs' }
            ]
        }
    ];
}

@Suite('common visual/a11y state matrix')
export class VisualA11yMatrixTest {
    ctx!: ApplicationContext;
    doc!: any;
    win!: any;

    @Before()
    async init() {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.win = dom.window;
        this.doc = dom.window.document;
        this.ctx = await Application.run(A11yMatrixHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, ButtonModule, CheckboxModule, TabsModule, MenuBarModule, DataTableModule, ToastModule, SelectModule, DialogModule, DrawerModule,
            SwitchModule, SliderModule, ProgressModule, PaginationModule, RateModule, SegmentedModule,
            UploadModule, BreadcrumbModule, ChipModule, TreeModule
        ],
            providers: [{ provide: DOCUMENT, useValue: this.doc }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    protected async mount(): Promise<ComponentRef<A11yMatrixHostComponent>> {
        const ref = this.ctx.get(ComponentFactory).create(A11yMatrixHostComponent, {
            injector: this.ctx
        }) as ComponentRef<A11yMatrixHostComponent>;
        await ref.render();
        await Promise.resolve();
        await Promise.resolve();
        return ref;
    }

    protected assertClean(root: any, label: string) {
        const violations = auditA11y(root, this.doc);
        expect(formatViolations(violations)).toEqual('');
    }

    @Test('six UI states stay accessible across light, dark and high-contrast themes')
    async stateMatrix() {
        const ref = await this.mount();
        const host = ref.instance as A11yMatrixHostComponent;
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        this.doc.body.appendChild(root);

        const buttons = Array.from(root.querySelectorAll('ui-button button')) as HTMLElement[];
        const checkbox = root.querySelector('[role="checkbox"]') as HTMLElement;
        const tabs = ref.hostView.query(TabsComponent) as ComponentRef<TabsComponent>;
        const menu = ref.hostView.query(MenuBarComponent) as ComponentRef<MenuBarComponent>;
        const table = ref.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        const toast = ref.hostView.query(ToastProviderComponent) as ComponentRef<ToastProviderComponent>;
        toast.instance.show('Saved', { durationMs: 0, actionLabel: 'Undo', action: () => undefined });
        await Promise.resolve();
        try {
            for (const theme of THEMES) {
                this.doc.documentElement.setAttribute('data-theme', theme);

                // 1. default
                this.assertClean(root, `${theme}/default`);

                // 2. keyboard focus
                buttons[0].focus();
                this.assertClean(root, `${theme}/focus`);

                // 3. selected / checked
                checkbox.click();
                this.assertClean(root, `${theme}/selected`);

                // 4. open overlays (menu with a nested flyout)
                (root.querySelector('.menu-bar-trigger') as HTMLElement).click();
                await Promise.resolve();
                (root.querySelector('[data-menu-id="view"]') as HTMLElement).click();
                await Promise.resolve();
                (root.querySelector('[data-menu-id="zoom"]') as HTMLElement).click();
                await Promise.resolve();
                this.assertClean(root, `${theme}/open`);

                // 5. disabled controls stay rendered but inert
                expect((buttons[2] as HTMLButtonElement).disabled).toEqual(true);
                this.assertClean(root, `${theme}/disabled`);

                // 6. loading / pending
                table.instance.loading = true;
                await Promise.resolve();
                await Promise.resolve();
                this.assertClean(root, `${theme}/loading`);

                menu.instance.close();
                table.instance.loading = false;
                tabs.instance.activeId = 'a';
                host.tabsSource.items[0].active = true;
                host.tabsSource.items[1].active = false;
                await Promise.resolve();
            }
        } finally {
            root.remove();
        }
    }

    @Test('theme switching only changes CSS, never component structure or roles')
    async themeStructure() {
        const ref = await this.mount();
        const root = ref.hostView.rootNodes[0] as HTMLElement;
        this.doc.body.appendChild(root);
        try {
            const markup = root.innerHTML;
            const roles = root.querySelectorAll('[role]').length;
            const classes = Array.from(root.querySelectorAll('[class]')).map(node => node.className);
            for (const theme of THEMES) {
                this.doc.documentElement.setAttribute('data-theme', theme);
                expect(root.innerHTML).toEqual(markup);
                expect(root.querySelectorAll('[role]').length).toEqual(roles);
                expect(Array.from(root.querySelectorAll('[class]')).map(node => node.className)).toEqual(classes);
            }
        } finally {
            root.remove();
        }
    }
}
