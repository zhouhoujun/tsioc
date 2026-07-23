import { Attribute, Component, AfterViewInit, OnDestroy } from '@tsdi/components';
import { formatCompactNumber } from '@tsdi/core';
import * as path from 'path';
import {
    buildTerminalBrandBlock,
    BrDirective,
    DivDirective,
    formatConsoleIndexedOptionLabel,
    LabelComponent,
    resolveConsoleListWindow,
    SpanDirective,
    TuiSelectComponent,
    TuiTextareaComponent,
    resolveConsoleEnterAction,
    resolveConsoleSelectWindow
} from '@tsdi/components/console';
import {
    AgentConsoleActivity,
    AgentConsoleApprovalRequest,
    AgentConsoleReviewWorker,
    AgentConsoleReviewTaskItem,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem,
    AgentConsoleSelectMenu,
    AgentConsoleSessionState,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun
} from './AgentConsoleSessionState';
import { ScheduledAgentTask } from '@tsdi/agent';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import {
    AgentConsoleMessageTemplateKind,
    AgentConsoleRenderedLine,
    AgentConsoleRenderedMessageItem,
    renderAgentConsoleMessageItems,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMessageRenderers';
import {
    AgentConsoleTheme,
    AgentConsoleThemeStyles,
    defaultAgentConsoleTheme,
    resolveAgentConsoleThemeStyles,
    styleTextToObject
} from './AgentConsoleTheme';

const CONSOLE_BASE_IMPORTS = [DivDirective, LabelComponent, SpanDirective, BrDirective];
const CONSOLE_FORM_IMPORTS = [TuiTextareaComponent, TuiSelectComponent, ...CONSOLE_BASE_IMPORTS];

function resolvePanelThemeStyles(state?: AgentConsoleSessionState, theme?: AgentConsoleTheme): AgentConsoleThemeStyles {
    return state?.themeStyles || resolveAgentConsoleThemeStyles(theme || defaultAgentConsoleTheme);
}

@Component({
    selector: 'agent-console-brand-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-brand-panel">
        <label class="brand-line" v-for="line in brandLines">{{line}}</label>
    </div>
    `
})
export class AgentConsoleBrandPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get brandLines(): string[] {
        return buildTerminalBrandBlock(
            this.state.consoleOptions.brandWidth,
            this.state.title,
            this.state.model,
            this.state.workspace
        );
    }
}

@Component({
    selector: 'agent-console-status-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-status-panel" v-style="shellStyle">
        <label class="status-line" v-style="statusStyle" v-for="line in statusLines">{{line}}</label>
    </div>
    `
})
export class AgentConsoleStatusPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get status(): string {
        return this.state.status;
    }

    get provider(): string {
        return this.state.provider;
    }

    get model(): string {
        return this.state.model;
    }

    get workspace(): string {
        return this.state.workspace;
    }

    get notice(): string {
        return this.state.notice;
    }

    get noticeLine(): string {
        return this.notice ? `note ${this.notice}` : '';
    }

    get statusSummary(): string {
        const lines: string[] = [];
        if (this.notice) {
            lines.push(this.notice);
        }
        if (this.state.lastError) {
            lines.push(`Error: ${this.lastErrorLabel}`);
        }
        if (this.state.pendingApprovals.length) {
            const requests = this.state.pendingApprovals;
            const first = requests[0];
            const extra = requests.length > 1 ? ` (+${requests.length - 1})` : '';
            lines.push(`Approval required: ${first.toolName} (${first.id.slice(0, 8)})${extra}`);
        }
        return lines.join('\n');
    }

    get workspaceSummary(): string {
        return this.workspace || this.state.consoleOptions.emptyValueLabel;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.statusShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.statusTitle;
    }

    get valueStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get runningToolsLabel(): string {
        return this.state.runningTools.length ? this.state.runningTools.join(', ') : this.state.consoleOptions.noneValueLabel;
    }

    get lastErrorLabel(): string {
        return this.state.lastError || this.state.consoleOptions.noneValueLabel;
    }

    get statusStyle() {
        return styleTextToObject(this.resolveToneStyle(this.state.status));
    }

    get statusLines(): string[] {
        if (!this.shouldShow) {
            return [];
        }
        return String(this.statusSummary || '')
            .split('\n')
            .map(line => line.trimEnd())
            .filter(Boolean)
            .slice(0, this.state.consoleOptions.statusVisibleLines);
    }

    get shouldShow(): boolean {
        return !!this.notice || !!this.state.lastError || !!this.state.pendingApprovals.length;
    }

    statusLineAt(index: number): string {
        return this.statusLines[index] || '';
    }

    get runningStyle() {
        return this.state.runningTools.length ? this.activeThemeStyles.statusBusyValue : this.activeThemeStyles.statusIdleValue;
    }

    get errorStyle() {
        return this.state.lastError ? this.activeThemeStyles.statusErrorValue : this.activeThemeStyles.statusLabel;
    }

    get noticeStyle() {
        return this.activeThemeStyles.statusNoticeValue;
    }

    protected resolveToneStyle(status: string): string {
        if (this.state.lastError) {
            return this.activeTheme.statusErrorValue;
        }
        if (this.notice) {
            return this.activeTheme.statusNoticeValue;
        }
        switch (status) {
            case 'running':
            case 'reasoning':
                return this.activeTheme.statusBusyValue;
            default:
                return this.activeTheme.statusIdleValue;
        }
    }
}

@Component({
    selector: 'agent-console-input-panel',
    imports: CONSOLE_FORM_IMPORTS,
    template: `
    <div class="console-panel console-input-panel">
        <div class="input-shell" v-style="shellStyle">
            <div class="input-entry" v-style="entryShellStyle">
                <textarea
                    class="agent-input"
                    v-style="fieldStyle"
                    value="{{input}}"
                    prompt="{{inputPrompt}}"
                    placeholder="{{inputPlaceholderLabel}}"
                    cursor=" "
                    cursorPos="{{inputCursor}}"
                    focused="{{inputFocused}}"
                    showCursor="false"
                    cursorTarget="input"
                    continuationPrompt="  "
                    @input="onInput($event)"
                    @click="onCursorChange($event)"
                    @keyup="onCursorChange($event)"
                    @focus="onFocus()"
                    @blur="onBlur()"
                    @keydown="onKeydown($event)"></textarea>
            </div>
        </div>
        <label class="input-meta" v-style="hintStyle">{{metaLabel}}</label>
    </div>
    `
})
export class AgentConsoleInputPanelComponent {
    constructor(
        private state?: AgentConsoleSessionState
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() submitAction?: () => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get input(): string {
        return this.state?.input || '';
    }

    set input(value: string) {
        this.state?.setInput(value, value.length);
    }

    get titleStyle() {
        return this.activeThemeStyles.inputTitle;
    }

    get inputCursor(): number {
        return this.state?.inputCursor ?? this.input.length;
    }

    get inputFocused(): boolean {
        return this.state?.inputFocused !== false;
    }

    get shellStyle() {
        return this.activeThemeStyles.inputShell;
    }

    get captionStyle() {
        return this.activeThemeStyles.inputCaption;
    }

    get inputPrompt(): string {
        return this.state?.inputPrompt || this.state?.consoleOptions?.inputPrompt || '';
    }

    get inputPlaceholderLabel(): string {
        return this.state?.inputPlaceholderLabel || '';
    }

    get entryStyle() {
        return this.activeThemeStyles.inputField;
    }

    get entryShellStyle() {
        return this.activeThemeStyles.inputEntry;
    }

    get promptStyle() {
        return this.activeThemeStyles.inputPrompt;
    }

    get fieldStyle() {
        return this.activeThemeStyles.inputField;
    }

    get hintStyle() {
        return this.activeThemeStyles.inputHint;
    }

    get hintLabel(): string {
        return this.state?.inputHintLabel || '';
    }

    get tokenUsageLabel(): string {
        return `${formatCompactNumber(this.state?.tokenUsage?.totalTokens ?? 0)} tokens`;
    }

    get metaLabel(): string {
        return [this.hintLabel, this.tokenUsageLabel].filter(Boolean).join(' · ');
    }

    async submit(): Promise<void> {
        await (this.submitAction || this.state?.submitAction)?.();
    }

    protected syncTextareaState(target?: HTMLTextAreaElement | null): void {
        if (!target || !this.state) {
            return;
        }
        const value = this.state.input || '';
        const cursor = this.state.inputCursor ?? value.length;
        if (target.value !== value) {
            target.value = value;
        }
        if (typeof target.setSelectionRange === 'function') {
            target.setSelectionRange(cursor, cursor);
        }
        target.focus?.();
    }

    onInput(event: Event): void {
        const target = event?.target as HTMLTextAreaElement | null;
        const value = String(target?.value || '');
        const cursor = typeof target?.selectionStart === 'number'
            ? target.selectionStart
            : value.length;
        this.state?.setInput(value, cursor);
        this.state?.resetInputHistoryNavigation();
    }

    onCursorChange(event: Event): void {
        const target = event?.target as HTMLTextAreaElement | null;
        if (typeof target?.selectionStart === 'number') {
            this.state?.setInputCursor(target.selectionStart);
        }
    }

    onFocus(): void {
        this.state?.setInputFocused(true);
    }

    onBlur(): void {
        this.state?.setInputFocused(false);
    }

    async onKeydown(event: KeyboardEvent): Promise<void> {
        if (this.state?.selectMenu) {
            if (String(event.key || '').trim().toLowerCase() === 'enter') {
                event.preventDefault?.();
                await this.state.processRawChunk('\r', {
                    submitOnEnter: true,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    hasSelectMenu: true
                });
                return;
            }
            if (this.state.handleSelectKey(event.key)) {
                event.preventDefault?.();
                return;
            }
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const handled = this.state?.navigateInputHistory(event.key === 'ArrowUp' ? -1 : 1);
            if (handled) {
                this.syncTextareaState(event.target as HTMLTextAreaElement | null);
                event.preventDefault?.();
                return;
            }
        }
        if (event.key === 'Enter') {
            const enterAction = resolveConsoleEnterAction({
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                hasSelectMenu: !!this.state?.selectMenu
            });
            if (enterAction === 'confirm-selection') {
                event.preventDefault?.();
                await this.state?.confirmSelectMenu();
                return;
            }
            if (enterAction !== 'submit') {
                return;
            }
            event.preventDefault?.();
            await this.submit();
            return;
        }
    }
}

@Component({
    selector: 'agent-console-working-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-working-panel" v-style="shellStyle">
        <label class="working-line">
            <span v-style="animatedCharStyleAt(0)">{{animatedCharAt(0)}}</span>
            <span v-style="animatedCharStyleAt(1)">{{animatedCharAt(1)}}</span>
            <span v-style="animatedCharStyleAt(2)">{{animatedCharAt(2)}}</span>
            <span v-style="animatedCharStyleAt(3)">{{animatedCharAt(3)}}</span>
            <span v-style="animatedCharStyleAt(4)">{{animatedCharAt(4)}}</span>
            <span v-style="animatedCharStyleAt(5)">{{animatedCharAt(5)}}</span>
            <span v-style="animatedCharStyleAt(6)">{{animatedCharAt(6)}}</span>
            <span v-style="labelStyle">{{workingSuffixLabel}}</span>
            <span v-style="lineStyle">{{workingDetail}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleWorkingPanelComponent implements AfterViewInit, OnDestroy {
    protected frame = 0;
    protected frameTimer?: ReturnType<typeof setInterval>;

    constructor(
        private state: AgentConsoleSessionState
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() tokenUsage: AgentConsoleTokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
    };

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.workingShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.workingTitle;
    }

    get lineStyle() {
        return this.activeThemeStyles.workingValue;
    }

    get labelStyle() {
        return this.activeThemeStyles.workingLabel;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get promptTokens(): number {
        return this.state.tokenUsage.promptTokens;
    }

    get completionTokens(): number {
        return this.state.tokenUsage.completionTokens;
    }

    get totalTokens(): number {
        return this.state.tokenUsage.totalTokens;
    }

    get messagesCount(): number {
        return this.state.messages.length;
    }

    get toolsCount(): number {
        return this.state.tools.length;
    }

    get toolRunsCount(): number {
        return this.state.toolRuns.length;
    }

    get activitiesCount(): number {
        return this.state.activities.length;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }

    get shouldShow(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get workingDetail(): string {
        if (!this.shouldShow) {
            return '';
        }
        const parts = [`(${this.elapsedLabel} • wait for reply)`];
        if (this.state.runningTools.length) {
            parts.push(this.runningLabel);
        }
        parts.push(`${this.totalTokens} tokens`);
        return ` ${parts.join(' · ')}`;
    }

    get workingLabel(): string {
        return `${this.animatedLabel}${this.workingSuffixLabel}`;
    }

    get animatedLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const running = this.state.runningTools;
        if (!running.length) {
            return 'Working';
        }
        return 'Waiting';
    }

    get workingSuffixLabel(): string {
        const running = this.state.runningTools;
        if (!running.length) {
            return '';
        }
        if (running.length === 1) {
            return ` for ${this.describeTool(running[0])}`;
        }
        return ' for tools';
    }

    get activeAnimatedCharIndex(): number {
        return this.frame % Math.max(this.animatedLabel.length, 1);
    }

    get animatedGlowRadius(): number {
        return 1;
    }

    animatedCharAt(index: number): string {
        return this.animatedLabel[index] || '';
    }

    animatedCharStyleAt(index: number): Record<string, string> {
        return Math.abs(index - this.activeAnimatedCharIndex) <= this.animatedGlowRadius
            ? this.accentStyle
            : this.labelStyle;
    }

    get elapsedLabel(): string {
        const startedAt = this.state.turnStartedAt;
        if (!startedAt) {
            return '0s';
        }
        const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        }
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }

    get runningLabel(): string {
        const count = this.state.runningTools.length;
        if (!count) {
            return 'running';
        }
        if (count === 1 && this.isTerminalTool(this.state.runningTools[0])) {
            return '1 background terminal running';
        }
        if (count === 1) {
            return `1 tool running`;
        }
        return `${count} tools running`;
    }

    protected describeTool(toolName: string): string {
        return this.isTerminalTool(toolName) ? 'background terminal' : toolName;
    }

    protected isTerminalTool(toolName: string): boolean {
        return /terminal|process|shell|exec|command/i.test(String(toolName || ''));
    }

    onAfterViewInit(): void {
        this.frameTimer = setInterval(() => {
            if (!this.shouldShow) {
                return;
            }
            this.frame = (this.frame + 1) % Math.max(this.animatedLabel.length, 1);
        }, 200);
        this.frameTimer.unref?.();
    }

    onDestroy(): void {
        if (this.frameTimer) {
            clearInterval(this.frameTimer);
            this.frameTimer = undefined;
        }
    }
}

@Component({
    selector: 'agent-console-sessions-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-sessions-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{sessionsSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="sessionsHintLabel">{{sessionsHintLabel}}</label>
        <label v-style="item.style" v-for="item in sessionItems">{{item.label}}</label>
    </div>
    `
})
export class AgentConsoleSessionsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get sessions(): AgentConsoleSessionItem[] {
        return this.state.sessions;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.sessionsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.sessionsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get sessionItems(): Array<{ id: string; label: string; style: Record<string, string> }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleSessions.map(session => {
            const current = session.current ? ' [current]' : '';
            const selected = this.state.selectedSessionId === session.id;
            const marker = selected ? '›' : ' ';
            const count = session.messageCount != null ? ` (${session.messageCount})` : '';
            const workspace = this.workspaceLabel(session.workspace);
            const workspacePrefix = workspace ? `[${workspace}] ` : '';
            return {
                id: session.id,
                label: `${marker} ${workspacePrefix}${session.id}${current}${count}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue
            };
        });
    }

    get visibleSessionStart(): number {
        const selectedIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.state.selectedSessionId));
        return resolveConsoleListWindow(
            this.sessions.length,
            selectedIndex,
            this.state.consoleOptions.sessionsVisibleItems
        ).start;
    }

    get visibleSessions(): AgentConsoleSessionItem[] {
        return this.sessions.slice(
            this.visibleSessionStart,
            this.visibleSessionStart + this.state.consoleOptions.sessionsVisibleItems
        );
    }

    get sessionsSummaryLabel(): string {
        if (!this.shouldShow || !this.sessions.length) {
            return '';
        }
        const selectedIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.state.selectedSessionId));
        return `sessions ${this.sessions.length} · ${selectedIndex + 1}/${this.sessions.length}`;
    }

    get sessionsHintLabel(): string {
        if (!this.shouldShow || !this.sessions.length || !this.state.sessionsFocused) {
            return '';
        }
        return this.state.consoleOptions.sessionHint;
    }

    get shouldShow(): boolean {
        return this.state.sessionsFocused;
    }

    sessionAt(index: number): { id: string; label: string; style: Record<string, string> } | undefined {
        return this.sessionItems[index];
    }

    sessionLabelAt(index: number): string {
        return this.sessionAt(index)?.label || '';
    }

    sessionStyleAt(index: number): Record<string, string> {
        return this.sessionAt(index)?.style || {};
    }

    protected workspaceLabel(workspace?: string): string {
        const text = String(workspace || '').trim();
        if (!text) {
            return '';
        }
        return path.basename(text) || text;
    }
}

@Component({
    selector: 'agent-console-tasks-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-tasks-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{tasksSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="tasksHintLabel">{{tasksHintLabel}}</label>
        <label v-style="listStyle" v-show="taskListLabel">{{taskListLabel}}</label>
        <label v-style="detailStyle" v-show="selectedTaskDetailLabel">{{selectedTaskDetailLabel}}</label>
    </div>
    `
})
export class AgentConsoleTasksPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get tasks(): AgentConsoleReviewTaskItem[] {
        return this.state.reviewTaskChoices;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.toolsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get taskItems(): Array<{ id: string; label: string }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleTasks.map(task => {
            const meta = [
                task.status || '',
                task.executionMode || '',
                typeof task.workerCount === 'number' ? `${task.workerCount}w` : ''
            ].filter(Boolean).join(' · ');
            return {
                id: task.id,
                label: `${this.state.selectedReviewTaskId === task.id ? '›' : ' '} ${task.id} · ${task.title}${meta ? ` (${meta})` : ''}`
            };
        });
    }

    get taskListLabel(): string {
        if (!this.shouldShow || !this.taskItems.length) {
            return '';
        }
        return this.taskItems.map(item => item.label).join('\n');
    }

    get visibleTaskStart(): number {
        const selectedIndex = Math.max(0, this.tasks.findIndex(item => item.id === this.state.selectedReviewTaskId));
        return resolveConsoleListWindow(
            this.tasks.length,
            selectedIndex,
            this.state.consoleOptions.sessionsVisibleItems
        ).start;
    }

    get visibleTasks(): AgentConsoleReviewTaskItem[] {
        return this.tasks.slice(
            this.visibleTaskStart,
            this.visibleTaskStart + this.state.consoleOptions.sessionsVisibleItems
        );
    }

    get tasksSummaryLabel(): string {
        if (!this.shouldShow || !this.tasks.length) {
            return '';
        }
        const selectedIndex = Math.max(0, this.tasks.findIndex(item => item.id === this.state.selectedReviewTaskId));
        return `tasks ${this.tasks.length} · ${selectedIndex + 1}/${this.tasks.length}`;
    }

    get tasksHintLabel(): string {
        if (!this.shouldShow || !this.tasks.length || !this.state.tasksFocused) {
            return '';
        }
        const selected = this.state.selectedTask;
        const actions = ['enter review'];
        if (selected && this.canCancelTask(selected)) {
            actions.push('x cancel');
        }
        if (selected && this.canRollbackTask(selected)) {
            actions.push('b rollback');
        }
        actions.push('y copy', 'esc');
        return `up/down move   pg jump   ${actions.join('   ')}`;
    }

    get selectedTaskDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedTask) {
            return '';
        }
        const task = this.state.selectedTask;
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        const checkpointSummary = checkpoints.length
            ? `${checkpoints.length} total · ${checkpoints.filter((entry: any) => entry?.status === 'available').length} available`
            : 'none';
        const rollback = task?.result?.rollback;
        const rollbackLabel = rollback?.available === true
            ? `available${rollback?.mode ? ` (${rollback.mode})` : ''}`
            : rollback?.rolledBackAt
                ? `applied${rollback?.mode ? ` (${rollback.mode})` : ''}`
                : 'unavailable';
        const parts = [
            `title ${task.title || task.id}`,
            task.status ? `status ${task.status}` : '',
            task?.result?.executionMode || task?.metadata?.executionMode ? `mode ${task?.result?.executionMode || task?.metadata?.executionMode}` : '',
            task?.planning?.summary ? `plan ${task.planning.summary}` : '',
            task?.goal ? `goal ${task.goal}` : '',
            `actions ${(task.actions || []).length}`,
            `workers ${Array.isArray(task?.result?.workers) ? task.result.workers.length : 0}`,
            `rollback ${rollbackLabel}`,
            `checkpoints ${checkpointSummary}`,
            task?.result?.diff?.summary ? `diff ${task.result.diff.summary}` : ''
        ].filter(Boolean);

        const actionLines = (task.actions || []).map((action: any, index: number) => {
            const actionMeta = [
                action?.status || 'unknown',
                action?.tool || '',
                action?.workerId ? `worker ${action.workerId}` : ''
            ].filter(Boolean).join(' · ');
            return `${index + 1}. ${action?.title || action?.id || 'action'}${actionMeta ? ` (${actionMeta})` : ''}`;
        });

        return [...parts, ...actionLines].join('\n');
    }

    get shouldShow(): boolean {
        return this.state.tasksFocused;
    }

    protected canCancelTask(task: any): boolean {
        const status = String(task?.status || '').trim();
        return status === 'planned' || status === 'running';
    }

    protected canRollbackTask(task: any): boolean {
        if (!task) {
            return false;
        }
        if (task?.result?.rollback?.available === true) {
            return true;
        }
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        return checkpoints.some((entry: any) => entry?.status === 'available');
    }
}

@Component({
    selector: 'agent-console-jobs-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-jobs-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{jobsSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="jobsHintLabel">{{jobsHintLabel}}</label>
        <label v-style="listStyle" v-show="jobListLabel">{{jobListLabel}}</label>
        <label v-style="detailStyle" v-show="selectedJobDetailLabel">{{selectedJobDetailLabel}}</label>
    </div>
    `
})
export class AgentConsoleJobsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get jobs(): ScheduledAgentTask[] {
        return this.state.scheduledTasks;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.toolsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get jobItems(): Array<{ id: string; label: string }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleJobs.map(job => {
            const summary = [
                job.scheduleType || 'once',
                job.paused ? 'paused' : '',
                job.running ? 'running' : '',
                job.cancelled ? 'cancelled' : ''
            ].filter(Boolean).join(' · ');
            const prompt = this.summarize(job.prompt);
            return {
                id: job.id,
                label: `${this.state.selectedScheduledTaskId === job.id ? '›' : ' '} ${job.id} · ${prompt}${summary ? ` (${summary})` : ''}`
            };
        });
    }

    get jobListLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        if (!this.jobs.length) {
            return 'no scheduled jobs';
        }
        return this.jobItems.map(item => item.label).join('\n');
    }

    get visibleJobStart(): number {
        const selectedIndex = Math.max(0, this.jobs.findIndex(item => item.id === this.state.selectedScheduledTaskId));
        return resolveConsoleListWindow(
            this.jobs.length,
            selectedIndex,
            this.state.consoleOptions.sessionsVisibleItems
        ).start;
    }

    get visibleJobs(): ScheduledAgentTask[] {
        return this.jobs.slice(
            this.visibleJobStart,
            this.visibleJobStart + this.state.consoleOptions.sessionsVisibleItems
        );
    }

    get jobsSummaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        if (!this.jobs.length) {
            return 'jobs 0';
        }
        const selectedIndex = Math.max(0, this.jobs.findIndex(item => item.id === this.state.selectedScheduledTaskId));
        return `jobs ${this.jobs.length} · ${selectedIndex + 1}/${this.jobs.length}`;
    }

    get jobsHintLabel(): string {
        if (!this.shouldShow || !this.state.jobsFocused) {
            return '';
        }
        if (!this.jobs.length) {
            return 'no scheduled jobs   use schedulePrompt';
        }
        return 'up/down move   pg jump   enter toggle pause/resume   x cancel   r recover   y copy   esc';
    }

    get selectedJobDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedScheduledTask) {
            return '';
        }
        return this.state.scheduledTaskDetailLines.join('\n');
    }

    get shouldShow(): boolean {
        return this.state.jobsFocused;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

@Component({
    selector: 'agent-console-approvals-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-approvals-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{approvalsSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="approvalsHintLabel">{{approvalsHintLabel}}</label>
        <label v-style="listStyle" v-show="approvalListLabel">{{approvalListLabel}}</label>
        <label v-style="detailStyle" v-show="selectedApprovalDetailLabel">{{selectedApprovalDetailLabel}}</label>
    </div>
    `
})
export class AgentConsoleApprovalsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get approvals(): AgentConsoleApprovalRequest[] {
        return this.state.pendingApprovals;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.toolsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get approvalItems(): Array<{ id: string; label: string }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleApprovals.map(request => {
            const selected = this.state.selectedApprovalId === request.id;
            return {
                id: request.id,
                label: `${selected ? '›' : ' '} ${request.toolName} (${request.id.slice(0, 8)})`
            };
        });
    }

    get approvalListLabel(): string {
        if (!this.shouldShow || !this.approvalItems.length) {
            return '';
        }
        return this.approvalItems.map(item => item.label).join('\n');
    }

    get visibleApprovalStart(): number {
        const selectedIndex = Math.max(0, this.approvals.findIndex(item => item.id === this.state.selectedApprovalId));
        return resolveConsoleListWindow(
            this.approvals.length,
            selectedIndex,
            this.state.consoleOptions.approvalsVisibleItems
        ).start;
    }

    get visibleApprovals(): AgentConsoleApprovalRequest[] {
        return this.approvals.slice(
            this.visibleApprovalStart,
            this.visibleApprovalStart + this.state.consoleOptions.approvalsVisibleItems
        );
    }

    get approvalsSummaryLabel(): string {
        if (!this.shouldShow || !this.approvals.length) {
            return '';
        }
        const selectedIndex = Math.max(0, this.approvals.findIndex(item => item.id === this.state.selectedApprovalId));
        return `approvals ${this.approvals.length} · ${selectedIndex + 1}/${this.approvals.length}`;
    }

    get approvalsHintLabel(): string {
        if (!this.shouldShow || !this.approvals.length || !this.state.approvalsFocused) {
            return '';
        }
        return this.state.consoleOptions.approvalsHint;
    }

    get selectedApprovalDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedApproval) {
            return '';
        }
        const request = this.state.selectedApproval;
        return [
            `tool ${request.toolName} · reason ${request.reason}`,
            request.inputSummary ? `input ${this.summarize(request.inputSummary)}` : 'input -',
            `timeout ${request.timeoutMs}ms · session ${request.sessionId}`
        ].join('\n');
    }

    get shouldShow(): boolean {
        return this.state.approvalsFocused;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

@Component({
    selector: 'agent-console-tools-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-tools-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{toolsSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="toolsHintLabel">{{toolsHintLabel}}</label>
        <label v-style="listStyle" v-show="toolListLabel">{{toolListLabel}}</label>
        <label v-style="detailStyle" v-show="selectedToolDetailLabel">{{selectedToolDetailLabel}}</label>
    </div>
    `
})
export class AgentConsoleToolsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get tools(): AgentConsoleToolItem[] {
        return this.state.tools;
    }

    get shellStyle() {
        return this.shouldShow ? this.activeThemeStyles.toolsShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.toolsTitle;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get toolItems(): Array<{ name: string; label: string; style: Record<string, string> }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.visibleTools.map(tool => {
            const selected = this.state.selectedToolName === tool.name;
            return {
                name: tool.name,
                label: `${selected ? '›' : ' '} ${tool.name}${tool.active ? '' : ' [inactive]'}${tool.toolset ? ` (${tool.toolset})` : ''}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue
            };
        });
    }

    get toolLabels(): string[] {
        return this.toolItems.map(item => item.label);
    }

    get toolListLabel(): string {
        if (!this.shouldShow || !this.toolItems.length) {
            return '';
        }
        return this.toolLabels.join('\n');
    }

    get toolsSummary(): string {
        return this.toolLabels.join(' | ');
    }

    get visibleToolStart(): number {
        const selectedIndex = Math.max(0, this.tools.findIndex(item => item.name === this.state.selectedToolName));
        return resolveConsoleListWindow(
            this.tools.length,
            selectedIndex,
            this.state.consoleOptions.toolsVisibleItems
        ).start;
    }

    get visibleTools(): AgentConsoleToolItem[] {
        return this.tools.slice(
            this.visibleToolStart,
            this.visibleToolStart + this.state.consoleOptions.toolsVisibleItems
        );
    }

    get toolsSummaryLabel(): string {
        if (!this.shouldShow || !this.tools.length) {
            return '';
        }
        const selectedIndex = Math.max(0, this.tools.findIndex(item => item.name === this.state.selectedToolName));
        return `tools ${this.tools.length} · ${selectedIndex + 1}/${this.tools.length}`;
    }

    get toolsHintLabel(): string {
        if (!this.shouldShow || !this.tools.length || !this.state.toolsFocused) {
            return '';
        }
        return this.state.consoleOptions.toolsHint;
    }

    get selectedToolDetailLabel(): string {
        if (!this.shouldShow || !this.state.selectedTool) {
            return '';
        }
        const tool = this.state.selectedTool;
        const latestRun = this.state.toolRuns.find(run => run.name === tool.name);
        const lines = [
            `status ${tool.active ? 'active' : 'inactive'} · activation ${tool.activationKind || 'always'} · toolset ${tool.toolset || 'default'}`
        ];
        if (latestRun) {
            const summary = latestRun.outputSummary || latestRun.inputSummary || latestRun.message || latestRun.error || '';
            const duration = latestRun.durationMs != null ? ` ${latestRun.durationMs}ms` : '';
            lines.push(`last run ${latestRun.status}${duration}: ${this.summarize(summary || latestRun.name)}`);
        }
        return lines.join('\n');
    }

    get shouldShow(): boolean {
        return this.state.toolsFocused;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

@Component({
    selector: 'agent-console-tool-runs-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-tool-runs-panel" v-style="shellStyle">
        <label class="tool-run-item" v-style="accentStyle">{{toolRunsSummaryLabel}}</label>
    </div>
    `
})
export class AgentConsoleToolRunsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get toolRuns(): AgentConsoleToolRun[] {
        return this.state.toolRuns;
    }

    get highlightedToolRun(): AgentConsoleToolRun | undefined {
        return this.state.highlightedToolRun;
    }

    get shellStyle() {
        return this.toolRunsSummaryLabel ? this.activeThemeStyles.toolRunsShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.toolRunsTitle;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get toolRunLabels(): string[] {
        return this.toolRuns.slice(0, this.state.consoleOptions.toolRunsVisibleItems).map(run => {
            const duration = run.durationMs == null ? '' : ` ${run.durationMs}ms`;
            return `${run.name} ${run.status}${duration}`;
        });
    }

    get toolRunsSummary(): string {
        return this.toolRunLabels.join(' | ');
    }

    get highlightedToolRunName(): string {
        return this.highlightedToolRun ? this.highlightedToolRun.name : '';
    }

    get highlightedToolRunStatus(): string {
        return this.highlightedToolRun ? this.highlightedToolRun.status : '';
    }

    get highlightedToolRunInput(): string {
        if (!this.highlightedToolRun) {
            return this.state.consoleOptions.emptyValueLabel;
        }
        return this.highlightedToolRun.inputSummary || this.state.consoleOptions.emptyValueLabel;
    }

    get highlightedToolRunOutput(): string {
        if (!this.highlightedToolRun) {
            return this.state.consoleOptions.emptyValueLabel;
        }
        return this.highlightedToolRun.outputSummary || this.highlightedToolRun.error || this.state.consoleOptions.emptyValueLabel;
    }

    get toolRunsSummaryLabel(): string {
        if (!this.highlightedToolRun || this.highlightedToolRun.status !== 'running') {
            return '';
        }
        const detail = this.highlightedToolRun.inputSummary || this.highlightedToolRun.message || this.highlightedToolRun.name;
        return `└ ${this.summarize(detail || this.highlightedToolRun.name)}`;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }
}

@Component({
    selector: 'agent-console-message-tokens',
    imports: [SpanDirective],
    template: `
    <span class="message-content">
        <span class="message-token" v-style="token.style" v-for="token in tokens">{{token.text}}</span>
    </span>
    `
})
export class AgentConsoleMessageTokensComponent {
    @Attribute() tokens: Array<AgentConsoleMarkdownToken & { style: Record<string, string> }> = [];
}

@Component({
    selector: 'agent-console-message-line',
    imports: [LabelComponent, SpanDirective, AgentConsoleMessageTokensComponent],
    template: `
    <label class="message-line" v-style="itemStyle">
        <span v-style="statusStyle">{{status}}</span><span v-style="roleStyle" v-show="role">{{role}}</span><span v-style="prefixStyle" v-show="prefix">{{prefix}}</span><span v-style="lineStyle"><agent-console-message-tokens :tokens="tokens"></agent-console-message-tokens></span>
    </label>
    `
})
export class AgentConsoleMessageLineComponent {
    @Attribute() line?: AgentConsoleRenderedLine;

    get itemStyle(): Record<string, string> {
        return this.line?.itemStyle || {};
    }

    get role(): string {
        return this.line?.role || '';
    }

    get status(): string {
        return this.line?.status || '';
    }

    get statusStyle(): Record<string, string> {
        return this.line?.statusStyle || {};
    }

    get roleStyle(): Record<string, string> {
        return this.line?.roleStyle || {};
    }

    get prefix(): string {
        return this.line?.prefix || '';
    }

    get prefixStyle(): Record<string, string> {
        return this.line?.prefixStyle || {};
    }

    get tokens(): Array<AgentConsoleMarkdownToken & { style: Record<string, string> }> {
        return this.line?.tokens || [];
    }

    get lineStyle(): Record<string, string> {
        return this.line?.lineStyle || {};
    }
}

const MESSAGE_ITEM_TEMPLATE = `
    <div class="message-item-block">
        <agent-console-message-line v-for="line in lines" :line="line"></agent-console-message-line>
    </div>
`;

const messageItemsCache = new WeakMap<object, {
    messages: Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }>;
    selectedMessageId: string;
    messagesFocused: boolean;
    theme: AgentConsoleTheme;
    consoleOptions: AgentConsoleSessionState['consoleOptions'];
    visibleItems: number;
    items: AgentConsoleRenderedMessageItem[];
}>();

abstract class AgentConsoleMessageItemComponentBase {
    protected item?: AgentConsoleRenderedMessageItem;

    get lines(): AgentConsoleRenderedLine[] {
        return this.item?.lines || [];
    }
}

@Component({
    selector: 'agent-console-user-message-item',
    imports: [...CONSOLE_BASE_IMPORTS, AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleUserMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-assistant-message-item',
    imports: [...CONSOLE_BASE_IMPORTS, AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleAssistantMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-tool-message-item',
    imports: [...CONSOLE_BASE_IMPORTS, AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleToolMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-error-message-item',
    imports: [...CONSOLE_BASE_IMPORTS, AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleErrorMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-system-message-item',
    imports: [...CONSOLE_BASE_IMPORTS, AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleSystemMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-messages-panel',
    imports: [
        ...CONSOLE_BASE_IMPORTS
    ],
    template: `
    <div class="console-panel console-messages-panel" v-style="shellStyle" renderRegion="messages">
        <label class="message-empty" v-style="emptyStyle" v-show="emptyLabel">{{emptyLabel}}</label>
        <label class="message-hint" v-style="titleStyle" v-show="messagesHintLabel">{{messagesHintLabel}}</label>
        <label class="message-line" v-style="line.itemStyle" v-for="line in renderedLines">
            <span v-style="line.statusStyle">{{line.status}}</span>
            <span v-style="line.roleStyle" v-show="line.role">{{line.role}}</span>
            <span v-style="line.prefixStyle" v-show="line.prefix">{{line.prefix}}</span>
            <span v-style="line.lineStyle">{{line.content}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleMessagesPanelComponent {
    constructor(
        private state: AgentConsoleSessionState
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get messages(): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        return this.state.displayMessages;
    }

    get shellStyle() {
        return (this.messageItems.length || this.emptyLabel)
            ? styleTextToObject(this.activeTheme.messagesShell)
            : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.messagesTitle);
    }

    get emptyStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get emptyLabel(): string {
        return '';
    }

    get visibleMessages(): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        const messages = this.messages;
        const selectedIndex = Math.max(0, messages.findIndex(message => message.id === this.state.selectedMessageId));
        const window = resolveConsoleListWindow(messages.length, selectedIndex, this.state.consoleOptions.messagesVisibleItems);
        return messages.slice(window.start, window.start + window.count);
    }

    get messageItems(): AgentConsoleRenderedMessageItem[] {
        const messages = this.messages;
        const theme = this.activeTheme;
        const selectedMessageId = this.state.selectedMessageId;
        const messagesFocused = this.state.messagesFocused;
        const visibleItems = this.state.consoleOptions.messagesVisibleItems;
        const consoleOptions = this.state.consoleOptions;
        const cached = messageItemsCache.get(this);

        if (cached
            && cached.messages === messages
            && cached.selectedMessageId === selectedMessageId
            && cached.messagesFocused === messagesFocused
            && cached.theme === theme
            && cached.consoleOptions === consoleOptions
            && cached.visibleItems === visibleItems) {
            return cached.items;
        }

        const items = renderAgentConsoleMessageItems(this.visibleMessages as any, {
            theme: this.activeTheme,
            selectedMessageId: this.state.selectedMessageId,
            messagesFocused: this.state.messagesFocused,
            statusLabels: this.state.consoleOptions.messageStatusLabels,
            statusSymbol: this.state.consoleOptions.messageStatusSymbol
        });
        messageItemsCache.set(this, {
            messages,
            selectedMessageId,
            messagesFocused,
            theme,
            consoleOptions,
            visibleItems,
            items
        });
        return items;
    }

    get messagesHintLabel(): string {
        if (!this.messages.length) {
            return '';
        }
        return this.state.messagesFocused
            ? this.state.consoleOptions.messagesHint
            : '';
    }

    get messageLabels(): string[] {
        return this.messageItems.flatMap(item => item.lines).map(line =>
            `${line.status || ''}${line.role || ''}${line.prefix || ''}${line.content}`
        );
    }

    get renderedLines(): AgentConsoleRenderedLine[] {
        return this.messageItems.flatMap(item => item.lines);
    }

    get messagesSummary(): string {
        return this.messageLabels.join(' | ');
    }

    protected resolveMarkdownToneStyle(tone: AgentConsoleMarkdownTone): Record<string, string> {
        return resolveAgentConsoleMarkdownToneStyle(tone, this.activeTheme);
    }
}

@Component({
    selector: 'agent-console-message-detail-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-message-detail-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{detailSummaryLabel}}</label>
        <label v-style="hintStyle">{{detailHintLabel}}</label>
        <label v-style="detailLineStyleAt(index)" v-for="index in detailIndexes">
            <span v-style="lineNumberStyle">{{detailLineNumberAt(index)}}</span><span v-style="detailLinePrefixStyleAt(index)" v-show="detailLinePrefixAt(index)">{{detailLinePrefixAt(index)}}</span><span v-style="detailLineContentStyleAt(index)">{{detailLineContentAt(index)}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleMessageDetailPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get selectedMessage() {
        return this.state.selectedMessage;
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

    get shouldShow(): boolean {
        return !!this.selectedMessage && this.state.messageDetailOpen;
    }

    get contentLines(): string[] {
        return this.state.messageDetailLines;
    }

    get visibleLines(): string[] {
        const lines = this.contentLines;
        const start = Math.max(0, Math.min(lines.length, this.state.messageDetailScroll));
        return lines.slice(start, start + this.state.consoleOptions.messageDetailVisibleLines);
    }

    get detailSummaryLabel(): string {
        if (!this.shouldShow || !this.selectedMessage) {
            return '';
        }
        const role = String(this.selectedMessage.role || 'system').toLowerCase();
        const displayMessages = this.state.displayMessages;
        const selectedIndex = Math.max(0, displayMessages.findIndex(item => item.id === this.selectedMessage?.id));
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.messageDetailScroll + 1);
        const end = Math.min(total, this.state.messageDetailScroll + this.visibleLines.length);
        const column = this.state.messageDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.state.messageDetailMaxColumn);
        return `message ${selectedIndex + 1}/${displayMessages.length} ${role}  |  lines ${start}-${end} / ${total}  |  col ${column}/${totalColumns}`;
    }

    get detailHintLabel(): string {
        if (!this.shouldShow || !this.selectedMessage) {
            return '';
        }
        return this.state.messageDetailOpen
            ? this.state.consoleOptions.messageDetailHint
            : this.state.consoleOptions.messageDetailClosedHint;
    }

    get detailIndexes(): number[] {
        return Array.from({ length: this.state.consoleOptions.messageDetailVisibleLines }, (_value, index) => index);
    }

    detailLineNumberAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const lineNumber = this.state.messageDetailScroll + index + 1;
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
        const start = Math.max(0, this.state.messageDetailColumnScroll);
        return line.slice(start);
    }

    detailLinePrefixAt(index: number): string {
        const line = this.detailMarkdownLineAt(index);
        if (!line) {
            return '';
        }
        if (this.state.messageDetailColumnScroll > 0) {
            return '';
        }
        return line.prefix || '';
    }

    detailLinePrefixStyleAt(index: number): Record<string, string> {
        const line = this.detailMarkdownLineAt(index);
        if (!line || this.state.messageDetailColumnScroll > 0) {
            return this.lineStyle;
        }
        if (line.prefixTone === 'quote') {
            return styleTextToObject(this.activeTheme.statusLabel);
        }
        if (line.prefixTone === 'heading') {
            return {
                ...styleTextToObject(this.activeTheme.toolsAccent),
                'font-weight': 'bold'
            };
        }
        return this.lineStyle;
    }

    detailLineStyleAt(index: number): Record<string, string> {
        return {
            display: 'block',
            'white-space': 'nowrap',
            ...(this.detailLineContentStyleAt(index))
        };
    }

    detailLineContentStyleAt(index: number): Record<string, string> {
        const line = this.detailMarkdownLineAt(index);
        if (!line || this.state.messageDetailColumnScroll > 0) {
            return this.lineStyle;
        }
        return {
            ...this.resolveMarkdownToneStyle(line.tone || 'default'),
            'white-space': 'nowrap'
        };
    }

    protected resolveMarkdownToneStyle(tone: AgentConsoleMarkdownTone): Record<string, string> {
        switch (tone) {
            case 'accent':
                return styleTextToObject(this.activeTheme.toolsAccent);
            case 'strong':
                return {
                    ...styleTextToObject(this.activeTheme.statusValue),
                    'font-weight': 'bold'
                };
            case 'code':
                return {
                    ...styleTextToObject(this.activeTheme.toolsAccent),
                    background: '#161b22'
                };
            case 'heading':
                return {
                    ...styleTextToObject(this.activeTheme.toolsAccent),
                    'font-weight': 'bold'
                };
            case 'muted':
            case 'quote':
                return styleTextToObject(this.activeTheme.statusLabel);
            default:
                return styleTextToObject(this.activeTheme.statusValue);
        }
    }

    protected detailMarkdownLineAt(index: number): AgentConsoleMarkdownLine | undefined {
        const line = this.visibleLines[index];
        if (line == null || !this.selectedMessage) {
            return undefined;
        }
        const sourceLines = renderAgentConsoleMarkdownLines(this.selectedMessage.content, {
            preserveFenceMarkers: true
        });
        const sourceIndex = this.state.messageDetailScroll + index;
        return sourceLines[sourceIndex];
    }

}

@Component({
    selector: 'agent-console-review-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-review-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{reviewSummaryLabel}}</label>
        <label v-style="hintStyle">{{reviewHintLabel}}</label>
        <label v-style="detailLineStyleAt(index)" v-for="index in detailIndexes">
            <span v-style="lineNumberStyle">{{detailLineNumberAt(index)}}</span><span v-style="detailLineContentStyle">{{detailLineContentAt(index)}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleReviewPanelComponent {
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
        const title = String(this.reviewTask?.title || this.state.selectedReviewTaskId || 'review');
        const taskId = String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim();
        const status = this.reviewTask?.status || 'unknown';
        const executionMode = this.state.reviewExecutionMode || 'n/a';
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.reviewDetailScroll + 1);
        const end = Math.min(total, this.state.reviewDetailScroll + this.visibleLines.length);
        const column = this.state.reviewDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.state.reviewDetailMaxColumn);
        const workerCount = this.reviewWorkers.length;
        return `review ${taskId || '-'} ${title}  |  ${status}  |  ${executionMode}  |  workers ${workerCount}  |  lines ${start}-${end} / ${total}  |  col ${column}/${totalColumns}`;
    }

    get reviewHintLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.consoleOptions.reviewDetailHint;
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
    selector: 'agent-console-activity-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-activity-panel" v-style="shellStyle">
        <label class="activity-item" v-for="item in activityItems">
            <span v-style="item.kindStyle">{{item.kind}}</span>
            <span v-style="item.messageStyle">{{item.message}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleActivityPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get activities(): AgentConsoleActivity[] {
        return this.state.visibleActivities;
    }

    get shellStyle() {
        return this.shouldShow ? styleTextToObject(this.activeTheme.activityShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.activityTitle);
    }

    get activityItems(): Array<{ kind: string; message: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> }> {
        if (!this.shouldShow) {
            return [];
        }
        return this.activities.slice(-this.state.consoleOptions.activityVisibleItems).map(activity => ({
            kind: `${activity.kind}: `,
            message: this.summarize(activity.message),
            kindStyle: styleTextToObject(this.activeTheme.toolsAccent),
            messageStyle: styleTextToObject(this.activeTheme.statusValue)
        }));
    }

    get shouldShow(): boolean {
        return this.activities.length > 0;
    }

    get activityLabels(): string[] {
        return this.activityItems.map(item => `${item.kind}${item.message}`);
    }

    get activitiesSummary(): string {
        return this.activityLabels.join(' | ');
    }

    activityAt(index: number): { kind: string; message: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> } | undefined {
        return this.activityItems[index];
    }

    activityKindAt(index: number): string {
        return this.activityAt(index)?.kind || '';
    }

    activityMessageAt(index: number): string {
        return this.activityAt(index)?.message || '';
    }

    activityKindStyleAt(index: number): Record<string, string> {
        return this.activityAt(index)?.kindStyle || {};
    }

    activityMessageStyleAt(index: number): Record<string, string> {
        return this.activityAt(index)?.messageStyle || {};
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.summaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.summaryMaxLength)}...`
            : text;
    }
}

@Component({
    selector: 'agent-console-select-panel',
    imports: CONSOLE_FORM_IMPORTS,
    template: `
        <div class="console-panel console-select-panel">
            <div class="select-shell" v-style="shellStyle">
            <select class="select-core"
                options="{{menuOptionsJson}}"
                selectedIndex="{{menuSelectedIndexText}}"
                visibleCount="{{visibleOptionCountText}}"
                optionActiveStyle="{{activeTheme.selectOptionActive}}"
                optionStyle="{{activeTheme.selectOption}}"
                @keydown="onKeydown($event)"></select>
        </div>
    </div>
    `
})
export class AgentConsoleSelectPanelComponent {
    constructor(
        private state: AgentConsoleSessionState
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() selectAction?: (value: string) => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get menu(): AgentConsoleSelectMenu | undefined {
        return this.state.selectMenu;
    }

    get shellStyle() {
        return this.menu ? styleTextToObject(this.activeTheme.selectShell) : {};
    }

    get menuOptions(): Array<{ label: string; value: string; description?: string }> {
        return (this.menu?.options || []).map(option => ({
            label: option.label,
            value: option.value,
            description: option.description || ''
        }));
    }

    get menuOptionsJson(): string {
        return JSON.stringify(this.menuOptions);
    }

    get menuSelectedIndex(): number {
        return this.menu?.selectedIndex ?? 0;
    }

    get menuSelectedIndexText(): string {
        return String(this.menuSelectedIndex);
    }

    get visibleOptionCountText(): string {
        return String(this.state.consoleOptions.selectVisibleOptions);
    }

    get visibleOptionStart(): number {
        if (!this.menu) {
            return 0;
        }
        return resolveConsoleSelectWindow(
            this.menu.options.length,
            this.menu.selectedIndex,
            this.state.consoleOptions.selectVisibleOptions
        ).start;
    }

    get visibleMenuOptions(): AgentConsoleSelectOption[] {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.slice(this.visibleOptionStart, this.visibleOptionStart + this.state.consoleOptions.selectVisibleOptions);
    }

    get menuOptionItems(): Array<{ label: string; value: string; style: Record<string, string> }> {
        if (!this.menu) {
            return [];
        }
        return this.visibleMenuOptions.map((option, index) => {
            const absoluteIndex = this.visibleOptionStart + index;
            return {
                label: formatConsoleIndexedOptionLabel(
                    absoluteIndex,
                    option.label,
                    !!this.menu && this.menu.selectedIndex === absoluteIndex
                ),
                value: option.value,
                style: styleTextToObject(this.menu && this.menu.selectedIndex === absoluteIndex ? this.activeTheme.selectOptionActive : this.activeTheme.selectOption)
            };
        });
    }

    optionAt(index: number): { label: string; value: string; style: Record<string, string> } | undefined {
        return this.menuOptionItems[index];
    }

    optionLabelAt(index: number): string {
        return this.optionAt(index)?.label || '';
    }

    optionStyleAt(index: number): Record<string, string> {
        return this.optionAt(index)?.style || {};
    }

    async selectOptionAt(index: number): Promise<void> {
        const option = this.optionAt(index);
        if (!option) {
            return;
        }
        await this.selectOption(option.value);
    }

    async selectOption(value: string): Promise<void> {
        await (this.selectAction || this.state.confirmSelectMenu.bind(this.state))(value);
    }

    async onKeydown(event: KeyboardEvent): Promise<void> {
        if (!this.menu) {
            return;
        }
        if (this.state.handleSelectKey(event.key)) {
            event.preventDefault?.();
        }
    }
}
