import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
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
import { DialogComponent, DialogModule } from '@tsdi/components/common/dialog';
import { AlertDialogComponent, AlertDialogModule } from '@tsdi/components/common/alert';

@Component({
    selector: 'common-ui-console-host',
    imports: [ButtonComponent, BadgeComponent, CardComponent, EmptyStateComponent, DividerComponent, StatComponent, ProgressComponent, BreadcrumbComponent, ToolbarComponent, StepsComponent, TimelineComponent, SkeletonComponent, AvatarComponent, PaginationComponent, DataTableComponent, TreeComponent, TextFieldComponent, CheckboxComponent, SwitchComponent, RadioGroupComponent, AlertNoticeComponent, SelectTriggerComponent, KbdComponent, ScrollbarComponent, ListComponent],
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
        <ui-tree :items="tree" :expandedIds="['root']"></ui-tree>
        <ui-text-field label="Name" value="Ada"></ui-text-field>
        <ui-checkbox label="Enabled" :checked="true"></ui-checkbox>
        <ui-switch label="Live" :checked="true"></ui-switch>
        <ui-radio-group :options="modes" value="basic"></ui-radio-group>
        <ui-alert title="Heads up" :lines="['First']" tone="warning"></ui-alert>
        <ui-select-trigger value="basic" label="Basic"></ui-select-trigger>
        <ui-kbd :keys="['Ctrl', 'K']"></ui-kbd>
        <ui-scrollbar :total="100" :visible="10" :offset="45" :length="10"></ui-scrollbar>
        <list :items="[]" :loading="true" error="Load failed" ariaLabel="History" :emptyLabel="'No history'"></list>
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
    tools = [{ id: 'run', label: 'Run' }, { kind: 'separator' }, { id: 'stop', label: 'Stop' }];
    steps = [{ label: 'Draft' }, { label: 'Review' }, { label: 'Publish' }];
    events = [{ title: 'Started', status: 'done' }, { title: 'Failed', status: 'error' }];
    tableColumns = [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }];
    tableRows = [{ id: 'a', name: 'Alpha', value: '1' }];
    tree = [{ id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] }];
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

@Suite('common base UI console rendering')
export class CommonUiConsoleTest {
    @Test('paints the primitive labels and text progress bar')
    async rendersPrimitives() {
        const ctx = await Application.run(CommonUiConsoleHostComponent, {
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
                ListModule
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
            expect(output).toContain('Loading');
            expect(output).toContain('Load failed');
            expect(output).not.toContain('aria-');

            // The real terminal painter (not the text-collector helper) hides
            // the empty row exactly like v-show does in the browser.
            const surface = new TuiTerminalSurface({
                renderer: new TuiRenderer(),
                root: ref.hostView.rootNodes[0] as any,
                width: 80,
                height: 40,
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
            } finally {
                surface.destroy();
            }
        } finally {
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
