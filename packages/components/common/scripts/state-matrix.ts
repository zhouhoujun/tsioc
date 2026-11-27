import { Attribute, Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { Application } from '@tsdi/core';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { UI_CSS, PLAIN_BUTTON_CSS } from '../src/ui.styles';
import { ButtonComponent, ButtonModule } from '../button';
import { CheckboxComponent, CheckboxModule } from '../checkbox';
import { TabsComponent, TabsModule } from '../tabs';
import { MenuBarComponent, MenuBarGroup, MenuBarModule } from '../menu-bar';
import { DataTableComponent, DataTableModule } from '../data-table';
import { AccordionComponent, AccordionModule } from '../accordion';
import { ToastProviderComponent, ToastModule } from '../toast';
import { MENU_BAR_CSS } from '../menu-bar/src/menu-bar.styles';
import { TAB_BAR_CSS } from '../tab-bar/src/tab-bar.styles';
import { TOAST_PROVIDER_CSS } from '../toast/src/toast-provider.styles';
import { ACCORDION_CSS } from '../accordion/src/accordion.styles';

export const STATE_MATRIX_THEMES = ['light', 'dark', 'high-contrast'] as const;
export const STATE_MATRIX_STATES = ['default', 'focus', 'selected', 'open', 'disabled', 'loading'] as const;

export interface StateMatrixReport {
    html: string;
    states: string[];
    themes: string[];
}

const menuGroups: MenuBarGroup[] = [
    {
        items: [
            { id: 'run', label: 'Run' },
            { id: 'stop', label: 'Stop', disabled: true },
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

@Component({
    selector: 'state-matrix-host',
    imports: [ButtonComponent, CheckboxComponent, TabsComponent, MenuBarComponent, DataTableComponent, AccordionComponent, ToastProviderComponent],
    template: `
    <div class="state-sample">
        <div class="state-row">
            <ui-button label="Save"></ui-button>
            <ui-button label="Saving" :loading="loadingButton" loadingLabel="Saving…"></ui-button>
            <ui-button label="Disabled" disabled></ui-button>
            <ui-checkbox label="Accept" :checked="checked" :disabled="disabledCheckbox"></ui-checkbox>
        </div>
        <tabs :source="tabsSource" activeId="a">
            <tab-pane data-tab-id="a">Alpha pane</tab-pane>
            <tab-pane data-tab-id="b">Beta pane</tab-pane>
        </tabs>
        <menu-bar label="Actions" :groups="menuGroups"></menu-bar>
        <ui-data-table ariaLabel="Runs" :columns="columns" :rows="rows"
            :selectedKeys="selectedRows" :loading="loadingTable" selectable></ui-data-table>
        <ui-accordion title="HTTP" :items="accordionItems" :expanded="true"></ui-accordion>
        <ui-toast-provider></ui-toast-provider>
    </div>`
})
class StateMatrixHostComponent {
    @Attribute() loadingButton = false;
    @Attribute() loadingTable = false;
    @Attribute() checked = true;
    @Attribute() disabledCheckbox = false;
    @Attribute() selectedRows: string[] = [];
    tabsSource = {
        visible: true,
        items: [
            { id: 'a', label: 'Alpha', active: true },
            { id: 'b', label: 'Beta' }
        ]
    };
    menuGroups = menuGroups;
    columns = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'status', label: 'Status' }
    ];
    rows = [
        { id: 'one', name: 'build', status: 'done' },
        { id: 'two', name: 'test', status: 'running' },
        { id: 'three', name: 'deploy', status: 'queued' }
    ];
    accordionItems = [
        { id: 'request', label: 'Request', description: 'POST /orders' },
        { id: 'response', label: 'Response', description: '200 OK' }
    ];
}

const THEME_CSS = `
[data-theme="light"] {
    --page-bg: #f8fafc; --page-fg: #0f172a; --page-muted: #64748b; --page-card: #ffffff;
    --page-border: #cbd5e1; --ui-bg: #ffffff; --ui-fg: #0f172a; --ui-text: #0f172a;
    --ui-border: #cbd5e1; --ui-muted-fg: #64748b; --ui-panel-bg: #f8fafc;
    --ui-card-bg: #ffffff; --ui-hover-bg: #f1f5f9; --ui-selected-bg: #e0f2fe;
    --ui-tone-bg: #2563eb; --ui-tone-fg: #ffffff; --ui-tone-border: #2563eb;
    --ui-focus-ring: #2563eb; --ui-danger-fg: #dc2626; --ui-success-fg: #16a34a;
}
[data-theme="dark"] {
    --page-bg: #0f172a; --page-fg: #e2e8f0; --page-muted: #94a3b8; --page-card: #111c2e;
    --page-border: #334155; --ui-bg: #0f172a; --ui-fg: #e2e8f0; --ui-text: #e2e8f0;
    --ui-border: #475569; --ui-muted-fg: #94a3b8; --ui-panel-bg: #16233a;
    --ui-card-bg: #111c2e; --ui-hover-bg: #1e293b; --ui-selected-bg: #1e3a5f;
    --ui-tone-bg: #38bdf8; --ui-tone-fg: #082f49; --ui-tone-border: #38bdf8;
    --ui-focus-ring: #38bdf8; --ui-danger-fg: #f87171; --ui-success-fg: #4ade80;
}
[data-theme="high-contrast"] {
    --page-bg: #000000; --page-fg: #ffffff; --page-muted: #e5e5e5; --page-card: #000000;
    --page-border: #ffffff; --ui-bg: #000000; --ui-fg: #ffffff; --ui-text: #ffffff;
    --ui-border: #ffffff; --ui-muted-fg: #e5e5e5; --ui-panel-bg: #111111;
    --ui-card-bg: #000000; --ui-hover-bg: #333333; --ui-selected-bg: #1d4ed8;
    --ui-tone-bg: #ffff00; --ui-tone-fg: #000000; --ui-tone-border: #ffff00;
    --ui-focus-ring: #ffff00; --ui-danger-fg: #ff6b6b; --ui-success-fg: #6bff6b;
}
`;

const PAGE_CSS = `
* { box-sizing: border-box; }
body { margin: 0; background: #e2e8f0; color: #0f172a; font: 14px/1.5 system-ui, sans-serif; }
header { padding: 20px 24px; background: #0f172a; color: #f8fafc; }
header h1 { margin: 0 0 4px; font-size: 20px; }
header p { margin: 0; color: #cbd5e1; }
main { padding: 20px 24px 48px; }
section.theme-section { margin-bottom: 28px; }
section.theme-section > h2 { margin: 0 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: .08em; }
.matrix-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; }
.matrix-card { border: 1px solid var(--page-border); border-radius: 10px; background: var(--page-card); color: var(--page-fg); padding: 10px; overflow: hidden; }
.matrix-card > h3 { margin: 0 0 8px; font-size: 12px; letter-spacing: .05em; color: var(--page-muted); text-transform: uppercase; }
.state-sample { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.state-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.state-sample .ui-toast-provider { position: static; inset: auto; display: block; }
.state-sample .ui-toast-provider .console-toast-stack { position: static; max-width: 100%; }
.matrix-card [data-matrix-focus="true"] { outline: 2px solid var(--ui-focus-ring); outline-offset: 1px; }
.matrix-card[data-state="disabled"] .state-sample { opacity: .9; }
.matrix-card[data-state="loading"] .state-sample { --ui-disabled-opacity: 1; }
`;

function tick(): Promise<void> {
    return Promise.resolve().then(() => Promise.resolve());
}

export async function renderStateMatrixHtml(): Promise<string> {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const doc = dom.window.document;
    const ctx = await Application.run(StateMatrixHostComponent, {
        deps: [
            HtmlTemplateModule,
            ComponentsModule,
            ButtonModule,
            CheckboxModule,
            TabsModule,
            MenuBarModule,
            DataTableModule,
            AccordionModule,
            ToastModule
        ],
        providers: [{ provide: DOCUMENT, useValue: doc }]
    });
    try {
        const rootRef = (ctx as any).runners.getRef(StateMatrixHostComponent) as ComponentRef<StateMatrixHostComponent>;
        const host = rootRef.instance as StateMatrixHostComponent;
        await rootRef.render();
        await tick();
        const root = rootRef.hostView.rootNodes[0] as HTMLElement;
        const tabs = rootRef.hostView.query(TabsComponent) as ComponentRef<TabsComponent>;
        const menu = rootRef.hostView.query(MenuBarComponent) as ComponentRef<MenuBarComponent>;
        const table = rootRef.hostView.query(DataTableComponent) as ComponentRef<DataTableComponent>;
        const toast = rootRef.hostView.query(ToastProviderComponent) as ComponentRef<ToastProviderComponent>;

        const reset = async () => {
            host.loadingButton = false;
            host.loadingTable = false;
            host.checked = true;
            host.disabledCheckbox = false;
            host.selectedRows = [];
            host.tabsSource.items[0].active = true;
            host.tabsSource.items[1].active = false;
            tabs.instance.activeId = 'a';
            menu.instance.close(false);
            toast.instance.clear();
            await tick();
            const button = root.querySelector('ui-button button') as HTMLElement;
            button?.removeAttribute('data-matrix-focus');
        };

        const states: Record<string, string> = {};
        const capture = async (state: string) => {
            await tick();
            states[state] = root.innerHTML;
        };

        await reset();
        await capture('default');

        const focusButton = root.querySelector('ui-button button') as HTMLElement;
        focusButton?.setAttribute('data-matrix-focus', 'true');
        await capture('focus');
        focusButton?.removeAttribute('data-matrix-focus');

        host.checked = false;
        host.tabsSource.items[0].active = false;
        host.tabsSource.items[1].active = true;
        tabs.instance.activeId = 'b';
        host.selectedRows = ['one'];
        await capture('selected');

        await reset();
        menu.instance.open = true;
        menu.instance.activeSubmenuPath = ['view'];
        toast.instance.show('Saved', { durationMs: 0, actionLabel: 'Undo' });
        await capture('open');

        await reset();
        host.disabledCheckbox = true;
        await capture('disabled');

        await reset();
        host.loadingButton = true;
        host.loadingTable = true;
        await capture('loading');

        const sections = STATE_MATRIX_THEMES.map(theme => {
            const cards = STATE_MATRIX_STATES.map(state => `
        <article class="matrix-card" data-state="${state}" data-theme="${theme}">
            <h3>${state}</h3>
            ${states[state] || ''}
        </article>`).join('');
            return `
    <section class="theme-section" data-theme-section="${theme}">
        <h2>${theme}</h2>
        <div class="matrix-grid">${cards}
        </div>
    </section>`;
        }).join('\n');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>@tsdi/components/common state matrix</title>
<style>${UI_CSS}${PLAIN_BUTTON_CSS}${MENU_BAR_CSS}${TAB_BAR_CSS}${TOAST_PROVIDER_CSS}${ACCORDION_CSS}${THEME_CSS}${PAGE_CSS}</style>
</head>
<body>
<header>
<h1>@tsdi/components/common state matrix</h1>
<p>${STATE_MATRIX_STATES.length} states × ${STATE_MATRIX_THEMES.length} themes, rendered from the real renderer-neutral components.</p>
</header>
<main>${sections}
</main>
</body>
</html>`;
        // Serialized renderer output keeps template indentation; generated docs
        // should stay whitespace-clean for `git diff --check`.
        return html.replace(/[ \t]+$/gm, '');
    } finally {
        await ctx.close();
    }
}
