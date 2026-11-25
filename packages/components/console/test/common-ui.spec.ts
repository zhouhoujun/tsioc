import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AnimationClock, Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleTemplateModule, TuiTerminalSurface } from '../src';
import { TuiRenderer } from '../src/tui';
import { ButtonComponent, ButtonModule } from '@tsdi/components/common/button';
import { BadgeComponent, BadgeModule } from '@tsdi/components/common/badge';
import { CardComponent, CardModule } from '@tsdi/components/common/card';
import { EmptyStateComponent, EmptyStateModule } from '@tsdi/components/common/empty-state';
import { DividerComponent, DividerModule } from '@tsdi/components/common/divider';
import { StatComponent, StatModule } from '@tsdi/components/common/stat';
import { ProgressComponent, ProgressModule } from '@tsdi/components/common/progress';
import { BreadcrumbComponent, BreadcrumbModule } from '@tsdi/components/common/breadcrumb';
import { ToolbarComponent, ToolbarModule } from '@tsdi/components/common/toolbar';
import { StepsComponent, StepsModule } from '@tsdi/components/common/steps';
import { TimelineComponent, TimelineModule } from '@tsdi/components/common/timeline';
import { SkeletonComponent, SkeletonModule } from '@tsdi/components/common/skeleton';
import { AvatarComponent, AvatarModule } from '@tsdi/components/common/avatar';
import { PaginationComponent, PaginationModule } from '@tsdi/components/common/pagination';
import { DataTableComponent, DataTableModule } from '@tsdi/components/common/data-table';
import { TreeComponent, TreeModule } from '@tsdi/components/common/tree';
import { TextFieldComponent, TextFieldModule } from '@tsdi/components/common/text-field';
import { CheckboxComponent, CheckboxModule } from '@tsdi/components/common/checkbox';
import { SwitchComponent, SwitchModule } from '@tsdi/components/common/switch';
import { RadioGroupComponent, RadioGroupModule } from '@tsdi/components/common/radio-group';
import { AlertNoticeComponent, AlertNoticeModule } from '@tsdi/components/common/alert-notice';
import { SelectTriggerComponent, SelectTriggerModule } from '@tsdi/components/common/select-trigger';
import { KbdComponent, KbdModule } from '@tsdi/components/common/kbd';
import { ScrollbarComponent, ScrollbarModule } from '@tsdi/components/common/scrollbar';
import { ListComponent, ListModule } from '@tsdi/components/common/list';
import { SliderComponent, SliderModule } from '@tsdi/components/common/slider';
import { SegmentedComponent, SegmentedModule } from '@tsdi/components/common/segmented';
import { ChipComponent, ChipModule } from '@tsdi/components/common/chip';
import { SpinnerComponent, SpinnerModule } from '@tsdi/components/common/spinner';
import { DescriptionsComponent, DescriptionsModule } from '@tsdi/components/common/descriptions';
import { TooltipComponent, TooltipModule } from '@tsdi/components/common/tooltip';
import { PopoverComponent, PopoverModule } from '@tsdi/components/common/popover';
import { TransferComponent, TransferModule } from '@tsdi/components/common/transfer';
import { TreeSelectComponent, TreeSelectModule } from '@tsdi/components/common/tree-select';
import { DialogComponent, DialogModule } from '@tsdi/components/common/dialog';
import { AlertDialogComponent, AlertDialogModule } from '@tsdi/components/common/alert';

@Component({
    selector: 'common-ui-console-host',
    imports: [ButtonComponent, BadgeComponent, CardComponent, EmptyStateComponent, DividerComponent, StatComponent, ProgressComponent, BreadcrumbComponent, ToolbarComponent, StepsComponent, TimelineComponent, SkeletonComponent, AvatarComponent, PaginationComponent, DataTableComponent, TreeComponent, TextFieldComponent, CheckboxComponent, SwitchComponent, RadioGroupComponent, AlertNoticeComponent, SelectTriggerComponent, KbdComponent, ScrollbarComponent, ListComponent, SliderComponent, SegmentedComponent, ChipComponent, SpinnerComponent, DescriptionsComponent, TooltipComponent, PopoverComponent, TransferComponent, TreeSelectComponent],
    template: `
    <div>
        <ui-button label="Save" tone="accent"></ui-button>
        <ui-badge label="running" tone="success" dot></ui-badge>
        <ui-badge label="Filter" :action="onBadge" active></ui-badge>
        <ui-progress label="Load" :value="30" :width="10"></ui-progress>
        <ui-stat label="Routes" value="2" hint="on"></ui-stat>
        <ui-divider label="Section" fill></ui-divider>
        <ui-breadcrumb :items="trail" :action="onCrumb"></ui-breadcrumb>
        <ui-empty title="Nothing" hint="Try" actionLabel="Reset"></ui-empty>
        <ui-card title="Card" meta="v1"><span>body</span></ui-card>
        <ui-toolbar :items="tools"></ui-toolbar>
        <ui-steps :items="steps" :current="1"></ui-steps>
        <ui-timeline :items="events"></ui-timeline>
        <ui-skeleton :lines="1" :width="6"></ui-skeleton>
        <ui-avatar label="Ada Lovelace"></ui-avatar>
        <ui-pagination :total="30" :pageSize="10" :page="2"></ui-pagination>
        <ui-data-table :columns="tableColumns" :rows="tableRows" rowKey="id" selectable :selectedKeys="['a']" :selectionAction="onSelection"></ui-data-table>
        <ui-data-table :columns="pagedColumns" :rows="pagedRows" rowKey="id" pagination :pageSize="2" expandable resizableColumns :detailLines="detailFor"></ui-data-table>
        <ui-tree :items="tree" :expandedIds="['root']" :selectAction="onTree" :toggleAction="onTreeToggle"></ui-tree>
        <ui-text-field label="Name" value="Ada"></ui-text-field>
        <ui-checkbox label="Enabled" :checked="true"></ui-checkbox>
        <ui-switch label="Live" :checked="true"></ui-switch>
        <ui-radio-group :options="modes" value="basic"></ui-radio-group>
        <ui-alert title="Heads up" :lines="['First']" tone="warning"></ui-alert>
        <ui-select-trigger value="basic" label="Basic"></ui-select-trigger>
        <ui-kbd :keys="['Ctrl', 'K']"></ui-kbd>
        <ui-scrollbar :total="100" :visible="10" :offset="45" :length="10"></ui-scrollbar>
        <list :items="[]" :loading="true" error="Load failed" ariaLabel="History" :emptyLabel="'No history'"></list>
        <ui-slider label="Zoom" :value="zoom" :step="10" unit="%" :changeAction="onZoom"></ui-slider>
        <ui-segmented :options="ranges" :value="range" ariaLabel="Range" :changeAction="onRange"></ui-segmented>
        <ui-chip label="tag" avatar="AL" :action="onChip" :removeAction="onChipRemove" :closable="true"><chip-prepend>★</chip-prepend></ui-chip>
        <ui-spinner label="Booting" :interval="100"></ui-spinner>
        <ui-descriptions :items="details" ariaLabel="Details"></ui-descriptions>
        <ui-descriptions :items="verticalDetails" layout="vertical" ariaLabel="Vertical details"></ui-descriptions>
        <ui-descriptions :groups="groupDetails" ariaLabel="Grouped details"></ui-descriptions>
        <ui-tooltip content="Inline help" :focusable="true"><span>Help</span></ui-tooltip>
        <ui-popover visible title="More info" :lines="['First pop', 'Second pop']"><span>Info</span></ui-popover>
        <ui-transfer :items="transferItems" :targetKeys="transferTargets" sourceTitle="Available" targetTitle="Chosen" emptyLabel="Empty" :changeAction="onTransfer"></ui-transfer>
        <ui-tree-select :items="selectTree" :expandedIds="['group']" ariaLabel="Category"></ui-tree-select>
    </div>`
})
class CommonUiConsoleHostComponent {
    trail = [{ label: 'Home' }, { label: 'Work' }];
    crumb = '';
    onCrumb = (item: any) => { this.crumb = item.label; };
    selection: string[] = [];
    onSelection = (keys: string[]) => { this.selection = keys.slice(); };
    badges = 0;
    onBadge = () => { this.badges += 1; };
    zoom = 50;
    onZoom = (value: number) => { this.zoom = value; };
    selectedTree = '';
    treeToggled = '';
    onTree = (node: any) => { this.selectedTree = node.id; };
    onTreeToggle = (node: any, expanded: boolean) => { this.treeToggled = `${node.id}:${expanded}`; };
    range = 'day';
    ranges = [{ label: 'Day', value: 'day' }, { label: 'Week', value: 'week' }];
    onRange = (value: string) => { this.range = value; };
    chipActions = 0;
    chipRemoves = 0;
    onChip = () => { this.chipActions += 1; };
    onChipRemove = () => { this.chipRemoves += 1; };
    details = [
        { label: 'Name', value: 'tsioc' },
        { label: 'Status', value: 'Ready', tone: 'success' }
    ];
    verticalDetails = [{ label: 'Vertical Name', value: 'vertical value' }];
    transferTargets = ['c'];
    transferItems = [
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta' },
        { key: 'c', label: 'Gamma' }
    ];
    onTransfer = (next: string[]) => { this.transferTargets = next; };
    groupDetails = [
        { title: 'Build', extra: 'v1', items: [{ label: 'Build Name', value: 'tsioc' }] },
        { title: 'Runtime', items: [{ label: 'Runtime Status', value: 'Ready' }] }
    ];
    tools = [{ id: 'run', label: 'Run' }, { kind: 'separator' }, { id: 'stop', label: 'Stop' }];
    steps = [{ label: 'Draft' }, { label: 'Review' }, { label: 'Publish' }];
    events = [{ title: 'Started', status: 'done' }, { title: 'Failed', status: 'error' }];
    tableColumns = [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }];
    tableRows = [{ id: 'a', name: 'Alpha', value: '1' }];
    pagedColumns = [{ key: 'name', label: 'Paged', fixed: 'left' }];
    detailFor = (row: any) => [`more ${row.name}`];
    pagedRows = [
        { id: 'o', name: 'Omega' },
        { id: 's', name: 'Sigma' },
        { id: 't', name: 'Tau' },
        { id: 'u', name: 'Upsilon' }
    ];
    tree = [{ id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] }];
    selectTree = [{ id: 'group', label: 'Group', children: [{ id: 'leaf', label: 'Leaf' }] }];
    modes = [{ label: 'Basic', value: 'basic' }, { label: 'Advanced', value: 'advanced' }];
}

@Component({
    selector: 'common-dialog-console-host',
    imports: [DialogComponent, AlertDialogComponent],
    template: `
    <div>
        <dialog-panel title="Confirm" :lines="['Proceed?']" ariaLabel="Confirm" @closeAction="onClose"></dialog-panel>
        <alert-dialog title="Notice" :lines="['Saved']" ariaLabel="Notice" actionLabel="Accept"></alert-dialog>
    </div>`
})
class CommonDialogConsoleHostComponent {
    closed = 0;
    onClose = () => { this.closed += 1; };
}

class FakeClock extends AnimationClock {
    protected listeners = new Set<() => void>();
    subscribe(listener: () => void): void { this.listeners.add(listener); }
    unsubscribe(listener: () => void): void { this.listeners.delete(listener); }
    tick(): void { this.listeners.forEach(listener => listener()); }
}

@Suite('common base UI console rendering')
export class CommonUiConsoleTest {
    @Test('paints the primitive labels and text progress bar')
    async rendersPrimitives() {
        const clock = new FakeClock();
        const realNow = Date.now;
        let now = 1000;
        Date.now = () => now;
        const ctx = await Application.run(CommonUiConsoleHostComponent, {
            providers: [{ provide: AnimationClock, useValue: clock }],
            deps: [
                ConsoleTemplateModule,
                ComponentsModule,
                ButtonModule,
                BadgeModule,
                CardModule,
                EmptyStateModule,
                DividerModule,
                StatModule,
                ProgressModule,
                BreadcrumbModule,
                ToolbarModule,
                StepsModule,
                TimelineModule,
                SkeletonModule,
                AvatarModule,
                PaginationModule,
                DataTableModule,
                TreeModule,
                TextFieldModule,
                CheckboxModule,
                SwitchModule,
                RadioGroupModule,
                AlertNoticeModule,
                SelectTriggerModule,
                KbdModule,
                ScrollbarModule,
                ListModule,
                SliderModule,
                SegmentedModule,
                ChipModule,
                SpinnerModule,
                DescriptionsModule,
                TooltipModule,
                PopoverModule,
                TransferModule,
                TreeSelectModule
            ]
        });
        try {
            const ref = ctx.runners.getRef(CommonUiConsoleHostComponent) as ComponentRef<CommonUiConsoleHostComponent>;
            await ref.render();
            await Promise.resolve();
            const host = ref.instance as CommonUiConsoleHostComponent;
            const output = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');

            expect(output).toContain('Save');
            expect(output).toContain('running');
            expect(output).toContain('Load');
            expect(output).toContain('███░░░░░░░');
            expect(output).toContain('30%');
            expect(output).toContain('Routes');
            expect(output).toContain('Section');
            expect(output).toContain('Home');
            expect(output).toContain('Nothing');
            expect(output).toContain('Reset');
            expect(output).toContain('Card');
            expect(output).toContain('body');
            expect(output).toContain('Run');
            expect(output).toContain('Draft');
            expect(output).toContain('Started');
            expect(output).toContain('░░░░░░');
            expect(output).toContain('AL');
            expect(output).toContain('Alpha');
            expect(output).toContain('Omega');
            expect(output).toContain('Sigma');
            expect(output).not.toContain('Tau');
            expect(output).toContain('✓');
            expect(output).toContain('Child');
            expect(output).toContain('Ada');
            expect(output).toContain('Enabled');
            expect(output).toContain('Live');
            expect(output).toContain('Basic');
            expect(output).toContain('Heads up');
            expect(output).toContain('Ctrl');
            expect(output).toContain('█');
            // Same state as the DOM surface: the current crumb, the live
            // loading row and the error alert all paint without aria noise.
            expect(output).toContain('Work');
            expect(output).toContain('Zoom');
            expect(output).toContain('50%');
            expect(output).toContain('Day');
            expect(output).toContain('Week');
            expect(output).toContain('│');
            expect(output).toContain('Booting');
            expect(output).toContain('Name');
            expect(output).toContain('Status');
            expect(output).toContain('tag');
            expect(output).toContain('AL');
            expect(output).toContain('★');
            expect(output).not.toContain('[ ✕ ]');
            expect(output).toContain('Loading');
            expect(output).toContain('Load failed');
            expect(output).not.toContain('aria-');

            // The real terminal painter (not the text-collector helper) hides
            // the empty row exactly like v-show does in the browser.
            const surface = new TuiTerminalSurface({
                renderer: new TuiRenderer(),
                root: ref.hostView.rootNodes[0] as any,
                width: 80,
                height: 80,
                output: { write() { } }
            });
            try {
                surface.render();
                const painted = surface.lastRenderedLines
                    .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, ''))
                    .join('\n');
                expect(painted).toContain('Load failed');
                expect(painted).toContain('Loading');
                expect(painted).not.toContain('No history');
                expect(painted).toContain('Name: tsioc');
                expect(painted).toContain('Status: Ready');
                const paintedLines = painted.split('\n').map((line: string) => line.trim()).filter(Boolean);
                expect(paintedLines).toContain('Vertical Name');
                expect(paintedLines).toContain('vertical value');
                expect(painted).not.toContain('Vertical Name: vertical value');
                const groupedLines = painted.split('\n').map((line: string) => line.trim());
                expect(groupedLines).toContain('Build · v1');
                expect(groupedLines).toContain('Build Name: tsioc');
                expect(groupedLines).toContain('Runtime');
                expect(groupedLines.indexOf('Build · v1')).toBeLessThan(groupedLines.indexOf('Build Name: tsioc'));
                expect(groupedLines.indexOf('Build Name: tsioc')).toBeLessThan(groupedLines.indexOf('Runtime'));
                expect(painted).not.toContain('Inline help');
                expect(painted).toContain('First pop');
                expect(painted).toContain('Second pop');
                expect(painted).not.toContain('[ ✕ ]');

                const tooltip = (ref.hostView.rootNodes[0] as any).querySelector('.ui-tooltip');
                tooltip.focus();
                await Promise.resolve();
                surface.render();
                const tipOpen = surface.lastRenderedLines.map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
                expect(tipOpen).toContain('Inline help');
                expect(surface.dispatchKey({ key: 'Escape' })).toEqual(true);
                await Promise.resolve();
                surface.render();
                const tipClosed = surface.lastRenderedLines.map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
                expect(tipClosed).not.toContain('Inline help');

                const popClose = (ref.hostView.rootNodes[0] as any).querySelector('.ui-popover-close');
                popClose.focus();
                expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
                await Promise.resolve();
                surface.render();
                const popClosed = surface.lastRenderedLines.map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
                expect(popClosed).not.toContain('First pop');

                const transferRoot = (ref.hostView.rootNodes[0] as any).querySelector('.ui-transfer');
                expect(transferRoot.textContent).toContain('Available (2)');
                expect(transferRoot.textContent).toContain('Chosen (1)');
                const sourceItem = transferRoot.querySelector('.ui-transfer-pane.is-source .ui-transfer-item');
                sourceItem.dispatchEvent({ type: 'click', target: sourceItem });
                await Promise.resolve();
                const moveRight = transferRoot.querySelector('.ui-transfer-action');
                moveRight.dispatchEvent({ type: 'click', target: moveRight });
                await Promise.resolve();
                const transferOutput = new TuiRenderer().renderToLines(transferRoot).join('\n');
                expect(transferOutput).toContain('Available (1)');
                expect(transferOutput).toContain('Chosen (2)');

                const selectRoot = (ref.hostView.rootNodes[0] as any).querySelector('.ui-tree-select');
                expect(selectRoot.textContent).toContain('Select…');
                (selectRoot.querySelector('.ui-tree-select-trigger') as any).dispatchEvent({ type: 'click', target: selectRoot });
                await Promise.resolve();
                expect(selectRoot.getAttribute('aria-expanded')).toEqual('true');
                const panelRows = selectRoot.querySelector('.ui-tree-select-panel').querySelectorAll('.ui-tree-row');
                panelRows[1].dispatchEvent({ type: 'click', target: panelRows[1] });
                await Promise.resolve();
                expect(selectRoot.getAttribute('aria-expanded')).toEqual('false');
                expect(selectRoot.textContent).toContain('Leaf');
                // Keyboard parity: the focused crumb handles Enter in the TUI
                // exactly like the browser's tabindex/Enter path.
                const crumb = (ref.hostView.rootNodes[0] as any).querySelector('.ui-breadcrumb-item[role="link"]');
                crumb.focus();
                expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
                await Promise.resolve();
                expect(host.crumb).toEqual('Home');
                // Checkbox focus + Space mirrors the browser roving checkbox.
                const check = (ref.hostView.rootNodes[0] as any).querySelector('.ui-data-table-row .ui-data-table-check');
                check.focus();
                expect(surface.dispatchKey({ key: ' ' })).toEqual(true);
                await Promise.resolve();
                expect(host.selection).toEqual([]);

                const checkbox = (ref.hostView.rootNodes[0] as any).querySelector('.ui-checkbox');
                checkbox.focus();
                expect(surface.dispatchKey({ key: ' ' })).toEqual(true);
                await Promise.resolve();
                expect(checkbox.getAttribute('aria-checked')).toEqual('false');

                const switchEl = (ref.hostView.rootNodes[0] as any).querySelector('.ui-switch');
                switchEl.focus();
                expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
                await Promise.resolve();
                expect(switchEl.getAttribute('aria-checked')).toEqual('false');

                const radios = (ref.hostView.rootNodes[0] as any).querySelectorAll('.ui-radio-option');
                radios[1].focus();
                expect(surface.dispatchKey({ key: ' ' })).toEqual(true);
                await Promise.resolve();
                expect(radios[0].getAttribute('aria-checked')).toEqual('false');
                expect(radios[1].getAttribute('aria-checked')).toEqual('true');

                const badge = Array.from((ref.hostView.rootNodes[0] as any).querySelectorAll('.ui-badge') as ArrayLike<any>)
                    .find((item: any) => item.getAttribute('role') === 'button');
                badge.focus();
                expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
                expect(host.badges).toEqual(1);

                const slider = (ref.hostView.rootNodes[0] as any).querySelector('.ui-slider');
                slider.focus();
                expect(surface.dispatchKey({ key: 'ArrowRight' })).toEqual(true);
                await Promise.resolve();
                expect(host.zoom).toEqual(60);
                expect(slider.getAttribute('aria-valuenow')).toEqual('60');
                expect(slider.getAttribute('aria-valuetext')).toEqual('60%');

                const expander = (ref.hostView.rootNodes[0] as any).querySelector('.ui-data-table-expander');
                expect(expander.getAttribute('aria-expanded')).toEqual('false');
                expander.dispatchEvent({ type: 'click', target: expander });
                await Promise.resolve();
                expect(expander.getAttribute('aria-expanded')).toEqual('true');
                const expandedOutput = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');
                expect(expandedOutput).toContain('more Omega');
                expect(new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n')).not.toContain('more Tau');

                const pager = (ref.hostView.rootNodes[0] as any).querySelector('.ui-data-table-pager');
                expect(pager).toBeTruthy();
                const steps = pager.querySelectorAll('.ui-pagination-step');
                steps[1].dispatchEvent({ type: 'click', target: steps[1] });
                await Promise.resolve();
                const pagedOutput = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');
                expect(pagedOutput).toContain('Tau');
                expect(pagedOutput).toContain('Upsilon');
                expect(pagedOutput).not.toContain('Omega');

                const spinner = (ref.hostView.rootNodes[0] as any).querySelector('.ui-spinner');
                const glyphNode = spinner.querySelector('.ui-spinner-glyph');
                expect(glyphNode.textContent).toEqual('⠋');
                now = 1100;
                clock.tick();
                await Promise.resolve();
                expect(glyphNode.textContent).toEqual('⠙');

                const chip = (ref.hostView.rootNodes[0] as any).querySelector('.ui-chip');
                chip.focus();
                expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
                expect(host.chipActions).toEqual(1);
                const chipClose = chip.querySelector('.ui-chip-close');
                chipClose.focus();
                expect(surface.dispatchKey({ key: 'Enter' })).toEqual(true);
                expect(host.chipRemoves).toEqual(1);
                expect(host.chipActions).toEqual(1);

                const treeRows = (ref.hostView.rootNodes[0] as any).querySelectorAll('.ui-tree-node');
                expect(treeRows[0].getAttribute('aria-expanded')).toEqual('true');
                expect(treeRows[0].getAttribute('tabindex')).toEqual('0');
                treeRows[0].focus();
                expect(surface.dispatchKey({ key: 'ArrowDown' })).toEqual(true);
                await Promise.resolve();
                expect(host.selectedTree).toEqual('child');
                expect(treeRows[1].getAttribute('aria-selected')).toEqual('true');
                expect(surface.dispatchKey({ key: 'ArrowLeft' })).toEqual(true);
                await Promise.resolve();
                expect(host.selectedTree).toEqual('root');
                expect(surface.dispatchKey({ key: 'ArrowLeft' })).toEqual(true);
                await Promise.resolve();
                expect(host.treeToggled).toEqual('root:false');
                surface.render();
                const collapsed = surface.lastRenderedLines
                    .map((line: string) => line.replace(/\x1b\[[0-9;]*m/g, ''))
                    .join('\n');
                expect(collapsed).toContain('Root');
                expect(collapsed).not.toContain('Child');

                const segmented = (ref.hostView.rootNodes[0] as any).querySelector('.ui-segmented-item.is-selected');
                segmented.focus();
                expect(surface.dispatchKey({ key: 'ArrowRight' })).toEqual(true);
                await Promise.resolve();
                expect(host.range).toEqual('week');
                expect((ref.hostView.rootNodes[0] as any).querySelectorAll('.ui-segmented-item')[1]
                    .getAttribute('aria-checked')).toEqual('true');
            } finally {
                surface.destroy();
            }
        } finally {
            Date.now = realNow;
            await ctx.close();
        }
    }

    @Test('plain dialog buttons paint inline instead of bracketed actions')
    async rendersPlainDialogButtons() {
        const ctx = await Application.run(CommonDialogConsoleHostComponent, {
            deps: [
                ConsoleTemplateModule,
                ComponentsModule,
                DialogModule,
                AlertDialogModule
            ]
        });
        try {
            const ref = ctx.runners.getRef(CommonDialogConsoleHostComponent) as ComponentRef<CommonDialogConsoleHostComponent>;
            await ref.render();
            await Promise.resolve();
            const output = new TuiRenderer().renderToLines(ref.hostView.rootNodes[0] as any).join('\n');

            expect(output).toContain('Confirm');
            expect(output).toContain('✕');
            expect(output).not.toContain('[ ✕ ]');
            expect(output).toContain('Accept');
            expect(output).not.toContain('[ Accept ]');
        } finally {
            await ctx.close();
        }
    }
}
