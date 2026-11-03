import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { DetailPanelComponent } from '@tsdi/components/common';
import { AgentConsoleReviewWorker, AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleTheme, defaultAgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { formatAgentPanelLabel as panelLabel } from './agent-ui.i18n';
import { formatReviewHeaderMeta, formatReviewSelectionMeta, formatReviewStatsMeta } from './AgentConsoleReviewPanelFormat';

@Component({
    selector: 'agent-console-timeline-event-detail-panel',
    imports: [DetailPanelComponent],
    template: `
    <detail-panel :summary="summaryLabel" :hint="hintLabel" :items="detailItems" :styles="panelStyles"></detail-panel>
    `
})
export class AgentConsoleTimelineEventDetailPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get shellStyle() {
        return this.shouldShow
            ? {
                padding: '1em 1ch',
                ...(styleTextToObject(this.activeTheme.messagesShell))
            }
            : {};
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get lineStyle() {
        return {
            ...styleTextToObject(this.activeTheme.statusValue),
            'white-space': 'nowrap'
        };
    }

    get lineNumberStyle() {
        return styleTextToObject(this.activeTheme.messageDetailLineNumber);
    }

    get lineContentStyle() {
        return {
            ...styleTextToObject(this.activeTheme.statusValue),
            'white-space': 'nowrap'
        };
    }

    get panelStyles() { return { shell: this.shellStyle, header: this.accentStyle, hint: this.hintStyle, line: this.lineStyle, number: this.lineNumberStyle, content: this.lineContentStyle }; }

    get shouldShow(): boolean {
        return this.state.timelineEventInspectorOpen && !!this.state.selectedTimelineEvent;
    }

    get contentLines(): string[] {
        return this.state.timelineEventDetailLines;
    }

    get visibleLines(): string[] {
        const lines = this.contentLines;
        const start = Math.max(0, Math.min(lines.length, this.state.timelineEventDetailScroll));
        return lines.slice(start, start + this.state.messageDetailVisibleLines);
    }

    get summaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const event = this.state.selectedTimelineEvent;
        if (!event) {
            return '';
        }
        const m = event.metadata || {};
        const eventType = m.uiEventType || 'unknown';
        const status = m.status || 'running';
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.timelineEventDetailScroll + 1);
        const end = Math.min(total, this.state.timelineEventDetailScroll + this.visibleLines.length);
        return `${eventType} ${status}  |  lines ${start}-${end} / ${total}`;
    }

    get hintLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.consoleOptions.messageDetailHint;
    }

    get detailItems() {
        return Array.from({ length: this.state.messageDetailVisibleLines }, (_value, index) => ({
            lineNumber: this.detailLineNumberAt(index),
            text: this.detailLineContentAt(index)
        }));
    }

    detailLineNumberAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const lineNumber = this.state.timelineEventDetailScroll + index + 1;
        return `${String(lineNumber).padStart(3, ' ')}| `;
    }

    detailLineContentAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const start = Math.max(0, this.state.timelineEventDetailColumnScroll);
        return line.slice(start);
    }

}

@Component({
    selector: 'agent-console-review-panel',
    template: `
    <div class="console-panel console-review-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{reviewSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="reviewStatsLabel">{{reviewStatsLabel}}</label>
        <label v-style="detailStyle" v-show="reviewSelectionLabel">{{reviewSelectionLabel}}</label>
        <label v-style="hintStyle">{{reviewHintLabel}}</label>
        <label v-style="detailLineStyleAt(index)" v-for="index in detailIndexes">
            <span v-style="lineNumberStyle">{{detailLineNumberAt(index)}}</span><span v-style="detailLineContentStyle">{{detailLineContentAt(index)}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleReviewPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get shellStyle() {
        return this.shouldShow
            ? {
                padding: '1em 1ch',
                ...(styleTextToObject(this.activeTheme.messagesShell))
            }
            : {};
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get metaStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get detailStyle() {
        return styleTextToObject(this.activeTheme.statusValue);
    }

    get detailLineContentStyle() {
        return {
            ...styleTextToObject(this.activeTheme.statusValue),
            'white-space': 'nowrap'
        };
    }

    get lineNumberStyle() {
        return styleTextToObject(this.activeTheme.messageDetailLineNumber);
    }

    get shouldShow(): boolean {
        return !!this.state.reviewOpen;
    }

    get reviewTask(): Record<string, any> | null | undefined {
        return this.state.reviewTask;
    }

    get reviewWorkers(): AgentConsoleReviewWorker[] {
        return this.state.reviewWorkers;
    }

    get contentLines(): string[] {
        return this.state.reviewDetailLines;
    }

    get visibleLines(): string[] {
        const lines = this.contentLines;
        const start = Math.max(0, Math.min(lines.length, this.state.reviewDetailScroll));
        return lines.slice(start, start + this.state.consoleOptions.reviewDetailVisibleLines);
    }

    get detailIndexes(): number[] {
        return Array.from({ length: this.state.consoleOptions.reviewDetailVisibleLines }, (_value, index) => index);
    }

    get reviewSummaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const total = this.contentLines.length;
        const lineageTasks = this.state.currentReviewLineageTasks;
        const selectedTaskId = String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim();
        const selectedFile = this.state.selectedReviewFileSection;
        return formatReviewHeaderMeta({
            taskId: String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim(),
            title: String(this.reviewTask?.title || this.state.selectedReviewTaskId || 'review'),
            sourceSessionId: String(this.reviewTask?.sourceSessionId || '').trim(),
            projectLabel: String(this.state.projectLabel || '').trim(),
            status: this.reviewTask?.status || 'unknown',
            mode: this.state.reviewExecutionMode || panelLabel(this.translator, 'review', 'notApplicable', 'n/a'),
            workerCount: this.reviewWorkers.length,
            lineageIndex: lineageTasks.length ? Math.max(0, lineageTasks.findIndex(item => item.id === selectedTaskId)) : -1,
            lineageTotal: lineageTasks.length,
            lineageRootId: this.state.resolveTaskLineageRootId(this.reviewTask || this.state.selectedTask),
            groupIndex: Math.min(this.state.reviewGroups.length, this.state.selectedReviewGroupIndex + 1),
            groupTotal: this.state.reviewGroups.length,
            groupLabel: this.state.selectedReviewGroup?.label || '-',
            fileIndex: Math.min(this.state.reviewFileSections.length, this.state.selectedReviewFileIndex + 1),
            fileTotal: this.state.reviewFileSections.length,
            filePath: selectedFile?.path || '-',
            start: Math.min(total, this.state.reviewDetailScroll + 1),
            end: Math.min(total, this.state.reviewDetailScroll + this.visibleLines.length),
            total,
            column: this.state.reviewDetailColumnScroll + 1,
            totalColumns: Math.max(1, this.state.reviewDetailMaxColumn)
        }, (key, fallback, params) => panelLabel(this.translator, 'review', key, fallback, params));
    }

    get reviewHintLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.consoleOptions.reviewDetailHint;
    }

    get reviewStatsLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const rollback = this.reviewTask?.result?.rollback;
        return formatReviewStatsMeta({
            status: this.reviewTask?.status || 'unknown',
            mode: this.state.reviewExecutionMode || panelLabel(this.translator, 'review', 'notApplicable', 'n/a'),
            workers: this.reviewWorkers.length,
            groups: this.state.reviewGroups.length,
            files: this.state.reviewFileSections.length,
            rollback: rollback?.available === true ? 'available' : rollback?.rolledBackAt ? 'applied' : 'unavailable'
        }, (key, fallback, params) => panelLabel(this.translator, 'review', key, fallback, params));
    }

    get reviewSelectionLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const selectedFile = this.state.selectedReviewFileSection;
        const total = this.contentLines.length;
        const lineageTasks = this.state.currentReviewLineageTasks;
        const selectedTaskId = String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim();
        return formatReviewSelectionMeta({
            lineageIndex: lineageTasks.length ? Math.max(0, lineageTasks.findIndex(item => item.id === selectedTaskId)) : -1,
            lineageTotal: lineageTasks.length,
            lineageRootId: this.state.resolveTaskLineageRootId(this.reviewTask || this.state.selectedTask),
            groupIndex: Math.min(this.state.reviewGroups.length, this.state.selectedReviewGroupIndex + 1),
            groupTotal: this.state.reviewGroups.length,
            groupLabel: this.state.selectedReviewGroup?.label || '-',
            fileIndex: Math.min(this.state.reviewFileSections.length, this.state.selectedReviewFileIndex + 1),
            fileTotal: this.state.reviewFileSections.length,
            filePath: selectedFile?.path || '-',
            risk: selectedFile ? this.state.computeFileRiskScore(selectedFile).level : '',
            start: Math.min(total, this.state.reviewDetailScroll + 1),
            end: Math.min(total, this.state.reviewDetailScroll + this.visibleLines.length),
            total,
            column: this.state.reviewDetailColumnScroll + 1,
            totalColumns: Math.max(1, this.state.reviewDetailMaxColumn)
        }, (key, fallback, params) => panelLabel(this.translator, 'review', key, fallback, params));
    }

    detailLineNumberAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const lineNumber = this.state.reviewDetailScroll + index + 1;
        return `${String(lineNumber).padStart(3, ' ')}| `;
    }

    detailLineContentAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const start = Math.max(0, this.state.reviewDetailColumnScroll);
        return line.slice(start);
    }

    detailLineStyleAt(index: number): Record<string, string> {
        return {
            display: 'block',
            'white-space': 'nowrap',
            ...(index < this.visibleLines.length ? this.detailLineContentStyle : {})
        };
    }
}

@Component({
    selector: 'agent-console-git-snapshot-panel',
    imports: [DetailPanelComponent],
    template: `
    <detail-panel :summary="gitSnapshotSummaryLabel" :meta="gitSnapshotStatsLabel" :hint="gitSnapshotHintLabel" :items="detailItems" :styles="panelStyles"></detail-panel>
    `
})
export class AgentConsoleGitSnapshotPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get shellStyle() {
        return this.shouldShow
            ? {
                padding: '1em 1ch',
                ...(styleTextToObject(this.activeTheme.messagesShell))
            }
            : {};
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get metaStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get detailStyle() {
        return styleTextToObject(this.activeTheme.statusValue);
    }

    get detailLineContentStyle() {
        return {
            ...styleTextToObject(this.activeTheme.statusValue),
            'white-space': 'nowrap'
        };
    }

    get lineNumberStyle() {
        return styleTextToObject(this.activeTheme.messageDetailLineNumber);
    }

    get panelStyles() { return { shell: this.shellStyle, header: this.accentStyle, meta: this.metaStyle, hint: this.hintStyle, number: this.lineNumberStyle }; }

    get shouldShow(): boolean {
        return !!this.state.gitSnapshotOpen;
    }

    get contentLines(): string[] {
        return this.state.gitSnapshotDetailLines;
    }

    get visibleLines(): string[] {
        const lines = this.contentLines;
        const start = Math.max(0, Math.min(lines.length, this.state.gitSnapshotDetailScroll));
        return lines.slice(start, start + this.state.consoleOptions.reviewDetailVisibleLines);
    }

    get detailItems() {
        return Array.from({ length: this.state.consoleOptions.reviewDetailVisibleLines }, (_value, index) => ({
            lineNumber: this.detailLineNumberAt(index),
            text: this.detailLineContentAt(index),
            style: this.detailLineStyleAt(index),
            numberStyle: this.lineNumberStyle,
            contentStyle: this.detailLineContentStyle
        }));
    }

    get gitSnapshotSummaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const header = this.state.gitSnapshotHeaderLabel || panelLabel(this.translator, 'gitSnapshot', 'defaultHeader', 'git snapshot diff');
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.gitSnapshotDetailScroll + 1);
        const end = Math.min(total, this.state.gitSnapshotDetailScroll + this.visibleLines.length);
        const column = this.state.gitSnapshotDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.gitSnapshotDetailMaxColumn);
        return panelLabel(this.translator, 'gitSnapshot', 'summary', '{header}  |  lines {start}-{end} / {total}  |  col {column}/{columns}', { header: header, start: start, end: end, total: total, column: column, columns: totalColumns });
    }

    get gitSnapshotHintLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return panelLabel(this.translator, 'gitSnapshot', 'hint', 'up/down scroll · left/right pan · pg jump · home/end edge · r revert · y copy · esc close');
    }

    get gitSnapshotStatsLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.gitSnapshotStatsLabel;
    }

    get gitSnapshotDetailMaxColumn(): number {
        return this.contentLines.reduce((max, line) => Math.max(max, line.length), 0);
    }

    detailLineNumberAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const lineNumber = this.state.gitSnapshotDetailScroll + index + 1;
        return `${String(lineNumber).padStart(3, ' ')}| `;
    }

    detailLineContentAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const start = Math.max(0, this.state.gitSnapshotDetailColumnScroll);
        return line.slice(start);
    }

    detailLineStyleAt(index: number): Record<string, string> {
        return {
            display: 'block',
            'white-space': 'nowrap',
            ...(index < this.visibleLines.length ? this.detailLineContentStyle : {})
        };
    }
}

