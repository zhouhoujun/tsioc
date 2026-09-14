import { Attribute, Component } from '@tsdi/components';
import { formatCompactNumber } from '@tsdi/core';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { AgentMessage, basenameAgentPath, ScheduledAgentTask } from '@tsdi/agent';
import {
    AgentConsoleActivity,
    AgentConsoleHealthItem,
    AgentConsoleHealthStatus,
    AgentConsolePlanTodoItem,
    AgentConsoleApprovalRequest,
    AgentConsoleReviewWorker,
    AgentConsoleReviewTaskItem,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem,
    AgentConsoleSelectMenu,
    AgentConsoleSessionState,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun,
    AgentConsoleCommandOutputEntry
} from './AgentConsoleSessionState';
import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import {
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
import { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import { resolveTimelineWindowLedger, TimelineWindowMode } from './AgentConsoleTimelineWindow';
import { agentUiDefaultFollowUpOnlyTermLists } from './agent-ui.i18n';
import {
    buildCommonBrandBlock as buildTerminalBrandBlock,
    formatCommonIndexedOptionLabel as formatConsoleIndexedOptionLabel,
    resolveCommonEnterAction as resolveConsoleEnterAction,
    resolveCommonListWindow as resolveConsoleListWindow,
    resolveCommonSelectWindow as resolveConsoleSelectWindow
} from '@tsdi/components/common';

// 折叠策略（对标 opencode/codex UI）：对话内容（assistant/user 普通回复、方案询问）永不折叠，全文展示；
// 仅辅助过程内容折叠：reasoning（4 行无尾）、工具事件/输出、fileChange、system、error、timelineBoundary（8 行保尾）
// 预算数值来自 policy render（this.state.consoleOptions.*，默认 auxiliary 8 / reasoning 4 / questionTailVisible 6）

function escapeFollowUpTerm(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveFollowUpOnlyMessageRegex(translator?: TranslatorService): RegExp | undefined {
    const translatedTerms = String(translator?.translate('agent.message.followUpOnlyTerms') || '');
    const sources = translatedTerms.includes('|')
        ? [translatedTerms, ...agentUiDefaultFollowUpOnlyTermLists]
        : agentUiDefaultFollowUpOnlyTermLists;
    const terms = sources
        .flatMap(source => source.split('|'))
        .map(term => term.trim())
        .filter(Boolean)
        .map(escapeFollowUpTerm);
    return terms.length
        ? new RegExp(`^(?:${terms.join('|')})(?:[\\s.!?~。！？、]*)$`, 'i')
        : undefined;
}

function resolvePanelThemeStyles(state?: AgentConsoleSessionState, theme?: AgentConsoleTheme): AgentConsoleThemeStyles {
    return state?.themeStyles || resolveAgentConsoleThemeStyles(theme || defaultAgentConsoleTheme);
}

function resolveSectionFrameStyle(baseStyleText: string | Record<string, string>): Record<string, string> {
    return {
        ...(typeof baseStyleText === 'string' ? styleTextToObject(baseStyleText) : baseStyleText),
        'border-top': '1px solid #30363d',
        'border-bottom': '1px solid #30363d',
        padding: '0.35em 0'
    };
}

@Component({
    selector: 'agent-console-brand-panel',
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
    template: `
    <div class="console-panel console-status-panel" v-style="shellStyle" @mouseenter="onHoverEnter()" @mouseleave="onHoverLeave()">
        <label class="status-line" v-style="statusStyle" v-for="line in statusLines">{{line}}</label>
    </div>
    `
})
export class AgentConsoleStatusPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    onHoverEnter(): void {
        void this.state?.toggleHealthPopoverAction?.();
    }

    onHoverLeave(): void {
        this.state?.setHealthPopoverVisible(false);
    }

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
        if (this.state.contextPreparationSummary) {
            lines.push(this.state.contextPreparationSummary);
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
        const lines: string[] = [];
        if (this.state.consoleOptions.showStatusline) {
            for (const field of this.state.statusline) {
                const line = this.statuslineFieldLine(field);
                if (line) {
                    lines.push(line);
                }
            }
        }
        lines.push(
            ...String(this.statusSummary || '')
                .split('\n')
                .map(line => line.trimEnd())
                .filter(Boolean)
        );
        return lines.slice(0, this.state.consoleOptions.statusVisibleLines);
    }

    protected statuslineFieldLine(field: AgentConsoleStatuslineField): string {
        switch (field) {
            case 'model': {
                const model = this.model || this.state.consoleOptions.noneValueLabel;
                return this.provider ? `model: ${this.provider}/${model}` : `model: ${model}`;
            }
            case 'context':
                return this.state.contextPreparationSummary ? `context: ${this.state.contextPreparationSummary}` : '';
            case 'git-branch':
                return this.state.gitBranch ? `git-branch: ${this.state.gitBranch}` : '';
            case 'tokens':
                return `tokens: ${formatCompactNumber(this.state.tokenUsage.totalTokens)}`;
            case 'session':
                return `session: ${this.state.sessionId}`;
            case 'workspace':
                return `workspace: ${this.workspace || this.state.consoleOptions.noneValueLabel}`;
            case 'agent':
                return this.state.title ? `agent: ${this.state.title}` : '';
            default:
                return '';
        }
    }

    get shouldShow(): boolean {
        return !!this.state.statusline.length || !!this.notice || !!this.state.pendingApprovals.length;
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
                    cursorStyle="color: #7ee787;"
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
        const base = this.state?.inputPrompt || this.state?.consoleOptions?.inputPrompt || '';
        const badges: string[] = [];
        if (this.state?.planMode) {
            badges.push('plan');
        }
        if (this.state?.vimMode) {
            badges.push(`vim ${this.state.inputMode}`);
        }
        if (this.state?.isSshShellActive) {
            badges.push(`ssh ${this.state.sshShell?.hostId || ''}`);
        }
        return badges.length ? `${base} · ${badges.join(' · ')}` : base;
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
        return [this.state?.planNudgeLabel, this.hintLabel, this.tokenUsageLabel].filter(Boolean).join(' · ');
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

    protected isEnterKey(event: KeyboardEvent): boolean {
        const key = String(event?.key || '').trim().toLowerCase();
        const code = String(event?.code || '').trim().toLowerCase();
        return key === 'enter'
            || key === 'return'
            || code === 'enter'
            || code.endsWith('enter');
    }

    protected isEscapeKey(event: KeyboardEvent): boolean {
        const key = String(event?.key || '').trim().toLowerCase();
        const code = String(event?.code || '').trim().toLowerCase();
        return key === 'escape' || key === 'esc' || code === 'escape';
    }

    async onKeydown(event: KeyboardEvent): Promise<void> {
        const key = String(event?.key || event?.code || '');
        if ((key === 'ArrowUp' || key === 'ArrowDown')
            && !(this.state?.selectMenu && isAgentConsoleSuggestionMenu(this.state.selectMenu))) {
            const handled = this.state?.navigateInputHistory(key === 'ArrowUp' ? -1 : 1);
            if (handled) {
                this.syncTextareaState(event.target as HTMLTextAreaElement | null);
                event.preventDefault?.();
                return;
            }
        }
        if (await this.state?.globalKeyInputAction?.(event.key, { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey })) {
            event.preventDefault?.();
            return;
        }
        if (event.key === 'Tab'
            && !event.ctrlKey && !event.metaKey && !event.altKey
            && (this.state?.status === 'running' || this.state?.status === 'reasoning')
            && this.state?.input.trim()
            && isAgentConsoleSuggestionMenu(this.state?.selectMenu)) {
            const queued = await this.state?.queueDraftAction?.();
            if (queued) {
                event.preventDefault?.();
                return;
            }
        }
        if (this.state?.selectMenu) {
            if (this.isEnterKey(event)) {
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
        if (this.state?.vimMode) {
            if (this.state.inputMode === 'insert' && this.isEscapeKey(event)) {
                event.preventDefault?.();
                this.state.setInputMode('normal');
                return;
            }
            if (this.state.inputMode === 'normal') {
                if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                    event.preventDefault?.();
                    this.state.handleVimKey(event.key);
                    this.syncTextareaState(event.target as HTMLTextAreaElement | null);
                    return;
                }
            }
        }
        if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const queued = await this.state?.queueDraftAction?.();
            if (queued) {
                event.preventDefault?.();
                return;
            }
            return;
        }
        if (this.isEnterKey(event)) {
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
    template: `
    <div class="console-panel console-working-panel" v-style="shellStyle">
        <label class="working-line" v-style="workingLineStyle">
            <span animated-text
                render-region="agent-working-animation"
                :text="animatedLabel"
                :scan-width="3"
                :active-style="accentStyle"
                :trail-style="labelStyle"
                :base-style="labelStyle">{{animatedLabel}}</span>
            <span v-style="labelStyle"> {{workingDetail}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleWorkingPanelComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
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

    get workingLineStyle(): Record<string, string> {
        return {
            ...this.activeThemeStyles.workingValue,
            padding: '0.6em 1ch 1em'
        };
    }

    get labelStyle() {
        return this.activeThemeStyles.workingLabel;
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

    get statsStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get qualityStyle() {
        return this.activeThemeStyles.statusNoticeValue;
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
        return this.hasWorkingState;
    }

    get workingDetail(): string {
        if (!this.hasWorkingState) {
            return '';
        }
        const parts = [`(${this.elapsedLabel} • esc to interrupt)`];
        if (this.state.runningTools.length) {
            const background = this.state.runningTools.filter(tool => this.isTerminalTool(tool)).length;
            if (background) {
                parts.push(`${background} background terminal${background === 1 ? '' : 's'} running`);
                parts.push('/ps to view');
                parts.push('/stop to close');
            } else {
                parts.push(this.runningLabel);
            }
        } else {
            const activePlan = this.state.planTodos.find(todo => todo.status === 'in_progress')
                || this.state.planTodos.find(todo => todo.status === 'pending');
            if (activePlan) {
                const index = this.state.planTodos.indexOf(activePlan) + 1;
                parts.push(`plan ${index}/${this.state.planTodos.length}: ${activePlan.content}`);
            }
            const latest = [...this.state.activities].reverse().find(activity =>
                activity.kind !== 'model' && activity.kind !== 'turn'
            );
            if (!activePlan) {
                parts.push(latest?.message || this.translator?.translate('agent.turn.preparing') || 'Preparing the response');
            }
        }
        if (this.totalTokens > 0) {
            parts.push(this.translator?.translate('agent.dashboard.tokens', { count: this.totalTokens })
                || `${this.totalTokens} tokens`);
        }
        if (this.state.consoleOptions.workingPresentation === 'dashboard') {
            const dashboard = this.dashboardCountersLabel;
            if (dashboard) {
                parts.push(dashboard);
            }
        }
        return ` ${parts.join(' · ')}`;
    }

    protected get hasWorkingState(): boolean {
        return this.state.status === 'running' || this.state.status === 'reasoning';
    }

    get toolRunProgressBar(): string {
        const runs = this.state.toolRuns.filter(r => r.status === 'running');
        if (!runs.length) {
            return '';
        }
        return runs.map(run => {
            const name = run.name.length > 12 ? run.name.slice(0, 12) + '…' : run.name;
            const attempt = run.attemptCount && run.attemptCount > 1 ? ` #${run.attemptCount}` : '';
            const barWidth = 8;
            const filled = run.attemptCount ? Math.min(Math.ceil(run.attemptCount / 3 * barWidth), barWidth) : 1;
            const empty = barWidth - filled;
            const bar = `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
            return `${bar} ${name}${attempt}`;
        }).join(' ');
    }

    get workingLabel(): string {
        return this.animatedLabel;
    }

    get animatedLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return `• ${this.translator?.translate('agent.turn.working') || 'Working'}`;
    }

    get dashboardCountersLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const activeTasks = this.activeDashboardTaskCount;
        const totalTasks = this.totalDashboardTaskCount;
        const runningJobs = this.state.scheduledTasks.filter(task => task.running).length;
        const activeApprovals = this.state.pendingApprovals.length;
        const activeTools = this.state.runningTools.length;
        const translate = (key: string, params: Record<string, any>, fallback: string) =>
            this.translator?.translate(key, params) || fallback;
        return [
            activeApprovals > 0 ? translate('agent.dashboard.approvals', { count: formatCompactNumber(activeApprovals) }, `approvals ${formatCompactNumber(activeApprovals)}`) : '',
            this.state.scheduledTasks.length > 0 ? translate('agent.dashboard.jobs', {
                running: formatCompactNumber(runningJobs),
                total: formatCompactNumber(this.state.scheduledTasks.length)
            }, `jobs ${formatCompactNumber(runningJobs)}/${formatCompactNumber(this.state.scheduledTasks.length)}`) : '',
            totalTasks > 0 ? translate('agent.dashboard.tasks', {
                active: formatCompactNumber(activeTasks),
                total: formatCompactNumber(totalTasks)
            }, `tasks ${formatCompactNumber(activeTasks)}/${formatCompactNumber(totalTasks)}`) : '',
            activeTools > 0 ? translate('agent.dashboard.tools', { count: formatCompactNumber(activeTools) }, `tools ${formatCompactNumber(activeTools)}`) : ''
        ].filter(Boolean).join(' · ');
    }

    get dashboardStatsLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const runs = this.state.toolRuns;
        if (!runs.length) {
            return '';
        }
        const completed = runs.filter(run => run.status !== 'running');
        const running = runs.length - completed.length;
        const success = completed.filter(run => run.status === 'success').length;
        const failed = completed.length - success;
        const durations = completed
            .map(run => run.durationMs)
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        const avgDuration = durations.length
            ? Math.round(durations.reduce((total, value) => total + value, 0) / durations.length)
            : 0;
        const successRate = completed.length ? Math.round((success / completed.length) * 100) : 0;
        return [
            runs.length > 0 ? `runs ${runs.length}` : '',
            success > 0 ? `ok ${success}` : '',
            failed > 0 ? `fail ${failed}` : '',
            running > 0 ? `running ${running}` : '',
            completed.length > 0 ? `success ${successRate}%` : '',
            durations.length > 0 ? `avg ${avgDuration}ms` : ''
        ].filter(Boolean).join(' · ');
    }

    get dashboardQualityLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.summaryQualityDigest ? `quality · ${this.state.summaryQualityDigest}` : '';
    }

    get dashboardUsageLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.usageDigest ? `usage · ${this.state.usageDigest}` : '';
    }

    get dashboardCompactionLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.compactionDigest ? `compaction · ${this.state.compactionDigest}` : '';
    }

    get dashboardTurnDiagnosticsLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return this.state.turnDiagnosticsDigest ? `diagnostics · ${this.state.turnDiagnosticsDigest}` : '';
    }

    get dashboardDetailLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const lines: string[] = [];
        if (this.state.contextPreparationSummary) {
            lines.push(this.state.contextPreparationSummary);
        }
        if (this.state.projectSummary) {
            lines.push(`project summary ${this.summarize(this.state.projectSummary)}`);
        }
        if (this.state.notice) {
            lines.push(`notice ${this.summarize(this.state.notice)}`);
        }
        if (this.state.lastError) {
            lines.push(`error ${this.summarize(this.state.lastError)}`);
        }
        const runningToolRuns = this.state.toolRuns.filter(r => r.status === 'running');
        if (runningToolRuns.length) {
            for (const run of runningToolRuns.slice(0, 2)) {
                const attempt = run.attemptCount && run.attemptCount > 1 ? ` #${run.attemptCount}` : '';
                const summary = run.inputSummary || run.message || run.name;
                lines.push(`▶ ${run.name}${attempt} · ${this.summarize(summary)}`);
            }
        }
        const latestToolRun = this.state.toolRuns.find(r => r.status !== 'running') || this.state.toolRuns[0];
        if (latestToolRun && !runningToolRuns.includes(latestToolRun)) {
            const summary = latestToolRun.outputSummary || latestToolRun.inputSummary || latestToolRun.message || latestToolRun.error || latestToolRun.name;
            lines.push(`tool ${latestToolRun.name} ${latestToolRun.status}${latestToolRun.durationMs != null ? ` ${latestToolRun.durationMs}ms` : ''} · ${this.summarize(summary)}`);
        }
        const latestJob = this.latestScheduledTask();
        if (latestJob) {
            lines.push(`job ${latestJob.id} · ${latestJob.running ? 'running' : latestJob.paused ? 'paused' : 'idle'}`);
        }
        const latestApproval = this.state.pendingApprovals[this.state.pendingApprovals.length - 1];
        if (latestApproval) {
            lines.push(`approval ${latestApproval.toolName} · ${this.summarize(latestApproval.reason)}`);
        }
        const latestTask = this.latestReviewTask();
        if (latestTask && !this.hasActivePlanTodos) {
            lines.push(`task ${latestTask.id} · ${this.summarize(latestTask.title)} · ${latestTask.status || 'idle'}`);
        }
        return lines.join(' · ');
    }

    protected get totalDashboardTaskCount(): number {
        return this.hasActivePlanTodos ? this.state.planTodos.length : this.state.reviewTaskChoices.length;
    }

    protected get activeDashboardTaskCount(): number {
        if (this.hasActivePlanTodos) {
            return this.state.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
        }
        return this.state.reviewTaskChoices.filter(task => this.isActiveReviewTask(task)).length;
    }

    protected get hasActivePlanTodos(): boolean {
        return this.state.planTodos.some(item => item.status === 'pending' || item.status === 'in_progress');
    }

    protected latestScheduledTask(): ScheduledAgentTask | undefined {
        return this.state.scheduledTasks
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0];
    }

    protected latestReviewTask(): AgentConsoleReviewTaskItem | undefined {
        return this.state.reviewTaskChoices
            .slice()
            .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))[0];
    }

    protected isActiveReviewTask(task?: AgentConsoleReviewTaskItem | null): boolean {
        const status = String(task?.status || '').trim().toLowerCase();
        return status === 'planned' || status === 'running';
    }

    protected workspaceLabel(workspace?: string): string {
        const text = String(workspace || '').trim();
        if (!text) {
            return '';
        }
        const segments = text.split(/[\\/]/).filter(Boolean);
        return segments[segments.length - 1] || text;
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > this.state.consoleOptions.toolRunSummaryMaxLength
            ? `${text.slice(0, this.state.consoleOptions.toolRunSummaryMaxLength)}...`
            : text;
    }

    protected lastElapsedSeconds = -1;
    protected lastElapsedLabel = '0s';

    get elapsedLabel(): string {
        const startedAt = this.state.turnStartedAt;
        if (!startedAt) {
            return '0s';
        }
        const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        if (totalSeconds === this.lastElapsedSeconds) {
            return this.lastElapsedLabel;
        }
        this.lastElapsedSeconds = totalSeconds;
        if (totalSeconds < 60) {
            this.lastElapsedLabel = `${totalSeconds}s`;
        } else {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            this.lastElapsedLabel = `${minutes}m ${seconds}s`;
        }
        return this.lastElapsedLabel;
    }

    get runningLabel(): string {
        const count = this.state.runningTools.length;
        if (!count) {
            return this.translator?.translate('agent.turn.working') || 'Working';
        }
        if (count === 1 && this.isTerminalTool(this.state.runningTools[0])) {
            return this.translator?.translate('agent.turn.backgroundCommand') || 'Running a background command';
        }
        return this.translator?.translate('agent.turn.toolsRunning', { count }) || `Running ${count} operations`;
    }

    protected isTerminalTool(toolName: string): boolean {
        return /terminal|process|shell|exec|command/i.test(String(toolName || ''));
    }
}

@Component({
    selector: 'agent-console-sessions-panel',
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
        return this.state.navFilteredSessions;
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
        const rows: Array<{ id: string; label: string; style: Record<string, string> }> = [];
        let previousProjectKey = '';
        for (const session of this.visibleSessions) {
            const projectKey = String(session.projectKey || '').trim();
            if (projectKey && projectKey !== previousProjectKey) {
                rows.push({
                    id: `${projectKey}::header`,
                    label: this.projectHeaderLabel(session),
                    style: this.activeThemeStyles.sessionsAccent
                });
            }
            const current = session.current ? ' [current]' : '';
            const selected = this.state.selectedSessionId === session.id;
            const marker = selected ? '›' : ' ';
            const count = session.messageCount != null ? ` (${session.messageCount})` : '';
            const workspace = this.workspaceLabel(session.workspace);
            const workspacePrefix = workspace ? `[${workspace}] ` : '';
            const name = String(session.title || '').trim() || session.id;
            const pinned = session.pinned ? ' 📌' : '';
            rows.push({
                id: session.id,
                label: `${marker} ${workspacePrefix}${name}${current}${count}${pinned}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue
            });
            previousProjectKey = projectKey;
        }
        return rows;
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
        return basenameAgentPath(text) || text;
    }

    protected projectHeaderLabel(session: AgentConsoleSessionItem): string {
        const label = String(session.projectLabel || session.projectId || session.workspace || session.primaryThreadId || '').trim();
        const displayLabel = this.workspaceLabel(label) || label || session.id;
        const count = Math.max(1, Number(session.projectSessionCount || 0));
        return `project ${displayLabel} · ${count} session${count === 1 ? '' : 's'}`;
    }
}

@Component({
    selector: 'agent-console-tasks-panel',
    template: `
    <div class="console-panel console-tasks-panel" v-style="shellStyle" role="region" aria-label="{{accessibilityLabel}}">
        <label v-style="accentStyle">{{tasksSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="backgroundTaskFeedLabel">{{backgroundTaskFeedLabel}}</label>
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
        return this.state.filteredReviewTaskChoices;
    }

    get planTodos(): AgentConsolePlanTodoItem[] {
        return this.state.planTodos;
    }

    get shellStyle() {
        return this.shouldShow ? resolveSectionFrameStyle(this.activeThemeStyles.toolsShell) : {};
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

    get backgroundTaskFeedLabel(): string {
        const tasks = this.state.filteredBackgroundTasks;
        if (!tasks.length) return '';
        const running = tasks.filter(task => task.status === 'running').length;
        const failed = tasks.filter(task => task.status === 'failed').length;
        const lines = tasks.slice(0, 8).map(task => {
            const marker = task.status === 'running' ? '>' : task.status === 'completed' ? 'x' : task.status === 'failed' ? '!' : '-';
            return `[${marker}] ${task.id} · ${task.goal} · ${task.sessionId}`;
        });
        const summary = `background ${tasks.length} · running ${running}${failed ? ` · failed ${failed}` : ''}`;
        return [summary, ...lines].join('\n');
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get taskItems(): Array<{ id: string; label: string }> {
        if (!this.shouldShow) {
            return [];
        }
        const showSourceSession = new Set(this.tasks.map(task => String(task.sourceSessionId || '').trim()).filter(Boolean)).size > 1;
        return this.visibleTasks.map(task => {
            const taskRecord = this.state.taskRecords.find(item => item?.id === task.id);
            const retryOfTaskId = typeof task.retryOfTaskId === 'string' && task.retryOfTaskId
                ? task.retryOfTaskId
                : typeof taskRecord?.metadata?.retrySourceTaskId === 'string' && taskRecord.metadata.retrySourceTaskId
                    ? taskRecord.metadata.retrySourceTaskId
                    : typeof taskRecord?.metadata?.retryOfTaskId === 'string' && taskRecord.metadata.retryOfTaskId
                        ? taskRecord.metadata.retryOfTaskId
                        : '';
            const retryDepth = typeof task.retryDepth === 'number'
                ? task.retryDepth
                : typeof taskRecord?.metadata?.retrySequence === 'number'
                    ? taskRecord.metadata.retrySequence
                    : undefined;
            const indentation = typeof retryDepth === 'number' && retryDepth > 0
                ? `${'  '.repeat(Math.min(retryDepth, 6))}- `
                : '';
            const lineageTaskCount = typeof task.lineageTaskCount === 'number'
                ? task.lineageTaskCount
                : undefined;
            const meta = [
                showSourceSession && task.sourceSessionId ? `session ${task.sourceSessionId}` : '',
                task.status || '',
                task.executionMode || '',
                typeof retryDepth === 'number' ? `retry ${retryDepth}` : '',
                retryOfTaskId ? `from ${retryOfTaskId}` : '',
                typeof lineageTaskCount === 'number' && lineageTaskCount > 1 ? `lineage ${lineageTaskCount}` : '',
                typeof task.workerCount === 'number' ? `${task.workerCount}w` : ''
            ].filter(Boolean).join(' · ');
            return {
                id: task.id,
                label: `${this.state.selectedReviewTaskId === task.id ? '›' : ' '} ${indentation}${task.id} · ${task.title}${meta ? ` (${meta})` : ''}`
            };
        });
    }

    get planListLabel(): string {
        if (!this.shouldShow || !this.shouldShowPlanTodos) {
            return '';
        }
        const sourceSessionId = String(this.state.planTodoSourceSessionId || '').trim();
        const sourcePrefix = sourceSessionId && sourceSessionId !== this.state.sessionId
            ? `session ${sourceSessionId} · `
            : '';
        if (!this.state.tasksFocused) {
            const active = this.planTodos.find(todo => todo.status === 'in_progress')
                || this.planTodos.find(todo => todo.status === 'pending');
            if (!active) {
                return '';
            }
            const blockedInfo = active.blockedBy?.length ? ` blocked by ${active.blockedBy.join(',')}` : '';
            const ownerInfo = active.owner ? ` (${active.owner})` : '';
            return `${sourcePrefix}current ${this.planTodos.findIndex(todo => todo.id === active.id) + 1}. [${this.todoStatusMark(active.status)}] ${active.content}${ownerInfo}${blockedInfo}`;
        }
        const filtered = this.state.filteredPlanTodos;
        const filterLabel = this.state.planTodoFilterLabel;
        const filterPrefix = filterLabel !== 'all' ? `[${filterLabel}] ` : '';
        const lines = filtered.map((todo, index) => {
            const marker = this.state.selectedPlanTodoIndex === index ? '›' : ' ';
            const hierarchy = todo.parentId ? '  ' : '';
            const blocked = todo.blockedBy?.length ? ` ← blocked by ${todo.blockedBy.join(',')}` : '';
            const owner = todo.owner ? ` (${todo.owner})` : '';
            const elapsed = todo.elapsedMs ? ` ${this.state.formatElapsed(todo.elapsedMs)}` : '';
            const error = todo.status === 'failed' && todo.error ? ` err: ${todo.error}` : '';
            return `${marker}${hierarchy}${index + 1}. [${this.todoStatusMark(todo.status)}] ${todo.content}${owner}${elapsed}${blocked}${error}`;
        });
        const totalCount = this.planTodos.length;
        const activeCount = this.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
        const blockedCount = this.planTodos.filter(item => item.blockedBy && item.blockedBy.length > 0).length;
        const failedCount = this.planTodos.filter(item => item.status === 'failed').length;
        const header = `${sourcePrefix}${filterPrefix}plan ${totalCount} · active ${activeCount}${blockedCount ? ` · blocked ${blockedCount}` : ''}${failedCount ? ` · failed ${failedCount}` : ''}`;
        return [header, ...lines].join('\n');
    }

    get taskListLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const sections = [
            this.planListLabel,
            this.taskItems.length ? this.taskItems.map(item => item.label).join('\n') : ''
        ].filter(Boolean);
        return sections.join('\n');
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
        if (!this.shouldShow) {
            return '';
        }
        const projectLabel = String(this.state.projectLabel || '').trim();
        const projectSuffix = projectLabel ? ` · project ${projectLabel}` : '';
        if (this.shouldShowPlanTodos) {
            const activeCount = this.planTodos.filter(item => item.status === 'pending' || item.status === 'in_progress').length;
            const blockedCount = this.planTodos.filter(item => item.blockedBy && item.blockedBy.length > 0).length;
            const failedCount = this.planTodos.filter(item => item.status === 'failed').length;
            const scopeSuffix = this.state.planScope === 'thread' ? ' · thread' : '';
            const filterLabel = this.state.planTodoFilter !== 'all' ? ` · filter ${this.state.planTodoFilterLabel}` : '';
            const selectedSuffix = this.state.selectedPlanTodoIndex >= 0 ? ` · ${this.state.selectedPlanTodoIndex + 1}/${this.state.filteredPlanTodos.length}` : '';
            return `plan ${this.planTodos.length} · active ${activeCount}${blockedCount ? ` · blocked ${blockedCount}` : ''}${failedCount ? ` · failed ${failedCount}` : ''}${filterLabel}${selectedSuffix}${scopeSuffix}${projectSuffix}`;
        }
        const totalCount = this.state.reviewTaskChoices.length;
        const filteredCount = this.tasks.length;
        const sessionCount = new Set(this.state.reviewTaskChoices.map(task => String(task.sourceSessionId || '').trim()).filter(Boolean)).size;
        if (!totalCount) {
            return '';
        }
        const filterLabel = this.taskFilterLabel;
        if (!filteredCount) {
            return `tasks 0/${totalCount} · ${filterLabel}${projectSuffix}`;
        }
        const selectedIndex = Math.max(0, this.tasks.findIndex(item => item.id === this.state.selectedReviewTaskId));
        const sourceSuffix = sessionCount > 1 ? ` · sessions ${sessionCount}` : '';
        return `tasks ${filteredCount}/${totalCount} · ${filterLabel} · ${selectedIndex + 1}/${filteredCount}${sourceSuffix}${projectSuffix}`;
    }

    /** Keeps plan state understandable when glyphs and color are unavailable. */
    get accessibilityLabel(): string {
        const summary = this.tasksSummaryLabel;
        if (!summary) {
            return 'Tasks and plan';
        }
        const active = this.planTodos.find(todo => todo.status === 'in_progress');
        const activeText = active ? ` Current step: ${active.content}.` : '';
        return `Tasks and plan. ${summary}.${activeText}`;
    }

    get tasksHintLabel(): string {
        if (!this.shouldShow || !this.state.tasksFocused) {
            return '';
        }
        if (this.shouldShowPlanTodos) {
            const actions = ['esc back'];
            actions.push('f filter');
            actions.push('j jump blocked');
            actions.push('k jump failed');
            actions.push('enter detail');
            actions.push('e expand');
            return `up/down move   ${actions.join('   ')}`;
        }
        const selected = this.state.selectedTask;
        const actions = ['enter review'];
        if (selected && this.canCancelTask(selected)) {
            actions.push('x cancel', 'esc cancel');
        } else {
            actions.push('esc');
        }
        if (selected && this.canRetryTask(selected)) {
            actions.push('r retry');
        }
        if (selected && this.canRollbackTask(selected)) {
            actions.push('b rollback');
        }
        if (selected && this.canFocusLineage(selected)) {
            actions.push('l lineage');
        }
        actions.push('f failed', 'v rollback', 'u all');
        actions.push('y copy');
        return `up/down move   pg jump   ${actions.join('   ')}`;
    }

    get selectedTaskDetailLabel(): string {
        if (!this.shouldShow || !this.state.tasksFocused) {
            return '';
        }
        if (this.shouldShowPlanTodos) {
            const planDetail = this.state.selectedPlanTodoDetailLabel;
            if (planDetail) {
                return planDetail;
            }
            return this.projectSummaryDetail;
        }
        if (!this.state.selectedTask) {
            if (this.state.reviewTaskChoices.length && !this.tasks.length) {
                return `No tasks matched filter ${this.taskFilterLabel}.`;
            }
            return '';
        }
        const task = this.state.selectedTask;
        const checkpoints = Array.isArray(task?.metadata?.checkpoints) ? task.metadata.checkpoints : [];
        const checkpointSummary = checkpoints.length
            ? `${checkpoints.length} total · ${checkpoints.filter((entry: any) => entry?.status === 'available').length} available`
            : 'none';
        const rollback = task?.result?.rollback;
        const aggregate = task?.result?.aggregate;
        const retrySourceTaskId = typeof task?.metadata?.retrySourceTaskId === 'string' && task.metadata.retrySourceTaskId
            ? task.metadata.retrySourceTaskId
            : typeof task?.metadata?.retryOfTaskId === 'string' && task.metadata.retryOfTaskId
                ? task.metadata.retryOfTaskId
                : '';
        const retryWorkerIds = Array.isArray(task?.metadata?.retryOfWorkerIds)
            ? task.metadata.retryOfWorkerIds.filter((item: any) => typeof item === 'string' && item)
            : [];
        const carryForwardWorkerIds = Array.isArray(task?.metadata?.carryForwardWorkerIds)
            ? task.metadata.carryForwardWorkerIds.filter((item: any) => typeof item === 'string' && item)
            : [];
        const retryDepth = typeof task?.metadata?.retrySequence === 'number'
            ? task.metadata.retrySequence
            : undefined;
        const lineageTaskCount = this.state.reviewTaskChoices.find(item => item.id === task.id)?.lineageTaskCount;
        const rollbackLabel = rollback?.available === true
            ? `available${rollback?.mode ? ` (${rollback.mode})` : ''}`
            : rollback?.rolledBackAt
                ? `applied${rollback?.mode ? ` (${rollback.mode})` : ''}`
                : 'unavailable';
        const workerStatus = aggregate
            ? `${aggregate.status} · ${aggregate.completedWorkers}/${aggregate.totalWorkers} completed${aggregate.failedWorkers ? ` · ${aggregate.failedWorkers} failed` : ''}`
            : '';
        const isolatedFailureLabel = Array.isArray(aggregate?.isolatedFailures) && aggregate.isolatedFailures.length
            ? `worker failures ${aggregate.isolatedFailures.slice(0, 2).map((failure: any) => `${failure.workerId}: ${failure.error}`).join(' · ')}`
            : '';
        const parts = [
            this.projectSummaryDetail,
            `title ${task.title || task.id}`,
            task?.sourceSessionId ? `session ${task.sourceSessionId}` : '',
            task.status ? `status ${task.status}` : '',
            task?.result?.executionMode || task?.metadata?.executionMode ? `mode ${task?.result?.executionMode || task?.metadata?.executionMode}` : '',
            task?.planning?.summary ? `plan ${task.planning.summary}` : '',
            task?.goal ? `goal ${task.goal}` : '',
            `actions ${(task.actions || []).length}`,
            `workers ${Array.isArray(task?.result?.workers) ? task.result.workers.length : 0}`,
            retryDepth !== undefined ? `retry depth ${retryDepth}` : '',
            typeof lineageTaskCount === 'number' && lineageTaskCount > 1 ? `lineage tasks ${lineageTaskCount}` : '',
            retrySourceTaskId ? `retry ${retrySourceTaskId}` : '',
            retryWorkerIds.length ? `retry workers ${retryWorkerIds.join(', ')}` : '',
            carryForwardWorkerIds.length ? `carry forward ${carryForwardWorkerIds.join(', ')}` : '',
            workerStatus ? `worker status ${workerStatus}` : '',
            isolatedFailureLabel,
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

    protected get projectSummaryDetail(): string {
        const summary = String(this.state.projectSummary || '').trim();
        if (!summary) return '';
        const limit = Math.max(1, this.state.consoleOptions.summaryMaxLength);
        return `summary ${summary.length > limit ? `${summary.slice(0, limit - 1).trimEnd()}…` : summary}`;
    }

    get shouldShow(): boolean {
        return this.state.tasksFocused;
    }

    protected get shouldShowPlanTodos(): boolean {
        return this.state.hasActivePlanTodos();
    }

    protected get taskFilterLabel(): string {
        switch (this.state.selectedTaskFilter) {
            case 'failed':
                return 'failed';
            case 'lineage':
                return this.state.selectedTaskLineageRootId ? `lineage ${this.state.selectedTaskLineageRootId}` : 'lineage';
            case 'rollback':
                return 'rollback';
            default:
                return 'all';
        }
    }

    protected todoStatusMark(status: AgentConsolePlanTodoItem['status']): string {
        switch (status) {
            case 'completed':
                return 'x';
            case 'cancelled':
                return '-';
            case 'in_progress':
                return '>';
            default:
                return ' ';
        }
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

    protected canRetryTask(task: any): boolean {
        if (!task) {
            return false;
        }
        const workers = Array.isArray(task?.result?.workers) ? task.result.workers : [];
        if (workers.some((worker: any) => worker?.status === 'failed')) {
            return true;
        }
        return Number(task?.result?.aggregate?.failedWorkers || 0) > 0;
    }

    protected canFocusLineage(task: any): boolean {
        if (!task) {
            return false;
        }
        const lineageTaskCount = this.state.reviewTaskChoices.find(item => item.id === task.id)?.lineageTaskCount;
        return Number(lineageTaskCount || 0) > 1;
    }
}

@Component({
    selector: 'agent-console-jobs-panel',
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
        return this.shouldShow ? resolveSectionFrameStyle(this.activeThemeStyles.toolsShell) : {};
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
    template: `
    <div class="console-panel console-approvals-panel" v-style="shellStyle" role="dialog" aria-label="{{accessibilityLabel}}">
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

    get accessibilityLabel(): string {
        if (!this.shouldShow) {
            return 'Approvals';
        }
        const selected = this.state.selectedApproval;
        return selected
            ? `Approvals. ${this.approvals.length} pending. Selected: ${selected.toolName}.`
            : `Approvals. ${this.approvals.length} pending.`;
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
    selector: 'agent-console-text-overlay-panel',
    template: `
    <div class="console-panel console-text-overlay-panel" v-style="shellStyle" role="dialog" aria-label="{{accessibilityLabel}}">
        <label v-style="accentStyle">{{overlayTitle}}</label>
        <label v-style="listStyle" v-for="line in visibleLines">{{line}}</label>
        <label v-style="metaStyle" v-show="hintLabel">{{hintLabel}}</label>
    </div>
    `
})
export class AgentConsoleTextOverlayPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() {
        return this.state.hasTextOverlayFocus() ? this.activeThemeStyles.toolRunsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get overlayTitle(): string {
        const overlay = this.state.textOverlay;
        if (!overlay) {
            return '';
        }
        return `${overlay.title} ${overlay.lines.length} lines · ${overlay.scroll + 1}-${Math.min(overlay.lines.length, overlay.scroll + this.state.consoleOptions.reviewDetailVisibleLines)}`.trim();
    }

    get visibleLines(): string[] {
        return this.state.textOverlayVisibleLines;
    }

    get hintLabel(): string {
        return this.state.hasTextOverlayFocus() ? 'Esc close · ↑↓ scroll' : '';
    }

    get accessibilityLabel(): string {
        const overlay = this.state.textOverlay;
        if (!overlay) {
            return 'Text details';
        }
        return `${overlay.title}. ${overlay.lines.length} lines. Showing ${overlay.scroll + 1} through ${Math.min(overlay.lines.length, overlay.scroll + this.state.consoleOptions.reviewDetailVisibleLines)}.`;
    }
}

@Component({
    selector: 'agent-console-outputs-panel',
    template: `
    <div class="console-panel console-command-outputs-panel" v-style="shellStyle" role="dialog" aria-label="{{accessibilityLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label v-style="accentStyle">{{panelTitle}}</label>
        <label v-style="metaStyle" v-show="filterLabel">{{filterLabel}}</label>
        <div role="listbox" aria-label="Command output history">
            <div id="{{item.id}}" v-style="item.style" role="option" aria-selected="{{item.selected}}" v-for="item in entryItems">{{item.label}}</div>
        </div>
        <label v-style="metaStyle" v-show="emptyLabel">{{emptyLabel}}</label>
        <label v-style="metaStyle" v-show="hintLabel">{{hintLabel}}</label>
    </div>
    `
})
export class AgentConsoleCommandOutputsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() {
        return this.state.hasCommandOutputsFocus() ? this.activeThemeStyles.toolRunsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get panelTitle(): string {
        const entries = this.state.visibleCommandOutputs;
        const total = this.state.commandOutputs.length;
        const selected = this.state.commandOutputsSelectedIndex;
        const visible = this.state.consoleOptions.reviewDetailVisibleLines;
        const range = entries.length
            ? `${selected + 1}-${Math.min(entries.length, selected + visible)}`
            : '0-0';
        return entries.length !== total
            ? `command outputs ${entries.length}/${total} · ${range}`
            : `command outputs ${total} · ${range}`;
    }

    get filterLabel(): string {
        return this.state.commandOutputsFilterMode
            ? `filter: ${this.state.commandOutputsFilter}`
            : '';
    }

    get entryItems(): Array<{ id: string; label: string; style: Record<string, string>; selected: string }> {
        const base = this.activeThemeStyles.statusValue;
        const selected = this.activeThemeStyles.messagesSelected || this.activeThemeStyles.sessionsSelected;
        return this.state.visibleCommandOutputs.map((entry, index) => {
            const preview = String(entry.text || '').replace(/\s+/g, ' ').trim();
            const text = preview.length > 160 ? `${preview.slice(0, 160)}…` : preview;
            const marker = entry.kind === 'error' ? '✗ ' : entry.kind === 'notice' ? '• ' : '';
            return {
                id: `command-output-option-${entry.id}`,
                label: `${marker}${entry.command}  ${text}`,
                selected: String(index === this.state.commandOutputsSelectedIndex),
                style: index === this.state.commandOutputsSelectedIndex
                    ? { ...base, ...selected }
                    : base
            };
        });
    }

    get emptyLabel(): string {
        if (this.state.commandOutputs.length === 0) {
            return 'No command outputs yet.';
        }
        if (this.state.visibleCommandOutputs.length === 0) {
            return 'No matching command outputs.';
        }
        return '';
    }

    get hintLabel(): string {
        return this.state.hasCommandOutputsFocus()
            ? 'Esc close · ↑↓/jk move · / filter · Enter copy'
            : '';
    }

    get accessibilityLabel(): string {
        const entries = this.state.visibleCommandOutputs;
        if (!entries.length) {
            return 'Command output history. No command outputs.';
        }
        const selected = entries[this.state.commandOutputsSelectedIndex];
        return `Command output history. ${entries.length} entries. Selected ${this.state.commandOutputsSelectedIndex + 1} of ${entries.length}: ${selected?.command || 'none'}.`;
    }

    get activeOptionId(): string {
        return this.entryItems[this.state.commandOutputsSelectedIndex]?.id || '';
    }
}

@Component({
    selector: 'agent-console-pending-question-panel',
    template: `
    <div class="console-panel console-pending-question-panel" v-style="shellStyle" role="dialog" aria-label="{{accessibilityLabel}}" aria-activedescendant="{{activeOptionId}}">
        <label v-style="accentStyle">{{pendingQuestionTitle}}</label>
        <label v-style="metaStyle" v-show="pendingQuestionContext">{{pendingQuestionContext}}</label>
        <div role="listbox" aria-label="Question options">
            <div id="{{item.id}}" v-style="listStyle" role="option" aria-selected="{{item.selected}}" v-for="item in pendingQuestionOptionItems" @click="onPendingQuestionOptionClick(item.value)">{{item.label}}</div>
        </div>
        <label v-style="metaStyle" v-show="pendingQuestionOptionItems.length">{{pendingQuestionSelectionHint}}</label>
    </div>
    `
})
export class AgentConsolePendingQuestionPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() {
        return this.activeThemeStyles.toolRunsShell;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get pendingQuestionTitle(): string {
        const question = this.state.pendingQuestion;
        if (!question) {
            return '';
        }
        const severity = question.severity === 'high' ? '[high] ' : '';
        const total = this.state.pendingQuestionTotal;
        const position = total > 1 ? ` [${1}/${total}]` : '';
        return `${severity}? ${question.question}${position}`;
    }

    get pendingQuestionContext(): string {
        return this.state.pendingQuestion?.context || '';
    }

    get pendingQuestionOptionItems(): Array<{ id: string; label: string; value: string; selected: string }> {
        return (this.state.pendingQuestion?.options || []).map((option, index) => ({
            id: `pending-question-option-${index}`,
            label: `${index + 1}. ${option}`,
            value: option,
            selected: String(index === this.state.pendingQuestionSelectedIndex)
        }));
    }

    get pendingQuestionSelectionHint(): string {
        const count = this.pendingQuestionOptionItems.length;
        if (!count) return '';
        const selected = Math.min(this.state.pendingQuestionSelectedIndex + 1, count);
        return `selected ${selected}/${count} · ↑↓ choose · 1-9 select · Enter confirm · Esc dismiss`;
    }

    get accessibilityLabel(): string {
        const question = this.state.pendingQuestion;
        if (!question) {
            return 'Question';
        }
        const count = question.options.length;
        return `Question: ${question.question}. ${count} options. Selected ${Math.min(this.state.pendingQuestionSelectedIndex + 1, count)} of ${count}.`;
    }

    get activeOptionId(): string {
        return this.pendingQuestionOptionItems[this.state.pendingQuestionSelectedIndex]?.id || '';
    }

    async onPendingQuestionOptionClick(option: string): Promise<void> {
        const index = this.state.pendingQuestion?.options.indexOf(option) ?? -1;
        if (index >= 0) {
            await this.state.choosePendingQuestion(index);
        }
    }
}

@Component({
    selector: 'agent-console-tool-runs-panel',
    template: `
    <div class="console-panel console-tool-runs-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{toolRunsSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="toolRunsHintLabel">{{toolRunsHintLabel}}</label>
        <label v-style="listStyle" v-show="toolRunListLabel">{{toolRunListLabel}}</label>
        <label v-style="detailStyle" v-show="selectedToolRunDetailLabel">{{selectedToolRunDetailLabel}}</label>
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

    get selectedToolRun(): AgentConsoleToolRun | undefined {
        return this.state.selectedToolRun;
    }

    get shellStyle() {
        return this.toolRuns.length ? this.activeThemeStyles.toolRunsShell : {};
    }

    get titleStyle() {
        return this.activeThemeStyles.toolRunsTitle;
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get detailStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get visibleToolRunStart(): number {
        const start = resolveConsoleListWindow(
            this.toolRuns.length,
            this.state.selectedToolRunIndex,
            this.state.consoleOptions.toolRunsVisibleItems
        ).start;
        return start;
    }

    get visibleToolRuns(): AgentConsoleToolRun[] {
        return this.toolRuns.slice(
            this.visibleToolRunStart,
            this.visibleToolRunStart + this.state.consoleOptions.toolRunsVisibleItems
        );
    }

    get toolRunItems(): Array<{ label: string; style: Record<string, string> }> {
        if (!this.toolRuns.length) {
            return [];
        }
        const start = this.visibleToolRunStart;
        return this.visibleToolRuns.map((run, offset) => {
            const index = start + offset;
            const selected = index === this.state.selectedToolRunIndex;
            const duration = run.durationMs == null ? '' : ` ${run.durationMs}ms`;
            const attempt = run.attemptCount && run.attemptCount > 1 ? ` #${run.attemptCount}` : '';
            return {
                label: `${selected ? '›' : ' '} ${run.name} [${run.status}]${duration}${attempt}`,
                style: selected
                    ? this.activeThemeStyles.sessionsSelected
                    : this.activeThemeStyles.statusValue
            };
        });
    }

    get toolRunLabels(): string[] {
        return this.toolRunItems.map(item => item.label);
    }

    get toolRunListLabel(): string {
        if (!this.toolRuns.length) {
            return '';
        }
        return this.toolRunLabels.join('\n');
    }

    get toolRunsSummaryLabel(): string {
        if (!this.toolRuns.length) {
            return '';
        }
        const running = this.toolRuns.filter(run => run.status === 'running').length;
        const parts = [`tool runs ${this.toolRuns.length}`];
        if (running) {
            parts.push(`running ${running}`);
        }
        const selected = this.selectedToolRun;
        if (selected) {
            const duration = selected.durationMs != null ? ` ${selected.durationMs}ms` : '';
            parts.push(`${selected.name} ${selected.status}${duration}`);
        }
        return parts.join(' · ');
    }

    get toolRunsHintLabel(): string {
        return this.state.toolRunsFocused ? this.state.consoleOptions.toolRunsHint : '';
    }

    get selectedToolRunDetailLabel(): string {
        const selected = this.selectedToolRun;
        if (!selected) {
            return '';
        }
        const lines: string[] = [];
        const attempt = selected.attemptCount && selected.attemptCount > 1 ? ` attempt #${selected.attemptCount}` : '';
        const duration = selected.durationMs != null ? ` duration ${selected.durationMs}ms` : '';
        lines.push(`${selected.name} [${selected.status}]${duration}${attempt}`);
        if (selected.executionMode) {
            lines.push(`mode ${selected.executionMode}`);
        }
        if (selected.inputSummary) {
            lines.push(`in ${this.summarize(selected.inputSummary)}`);
        }
        if (selected.outputSummary) {
            lines.push(`out ${this.summarize(selected.outputSummary)}`);
        }
        if (selected.error) {
            lines.push(`error ${this.summarize(selected.error)}`);
        }
        return lines.join('\n');
    }

    protected summarize(value: string, maxLength?: number): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        const limit = maxLength ?? this.state?.consoleOptions?.toolRunSummaryMaxLength ?? 96;
        return text.length > limit ? `${text.slice(0, limit)}...` : text;
    }
}

@Component({
    selector: 'agent-console-message-tokens',
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
    imports: [AgentConsoleMessageTokensComponent],
    template: `
    <label class="message-line" v-style="itemStyle" aria-label="{{ariaLabel}}">
        <span v-style="statusStyle">{{status}}</span>
        <span v-style="roleStyle" v-show="role">{{role}}</span>
        <span v-style="metaStyle" v-show="meta">{{meta}}</span>
        <span v-style="prefixStyle" v-show="prefix">{{prefix}}</span>
        <span v-style="lineStyle"><agent-console-message-tokens :tokens="contentTokens"></agent-console-message-tokens></span>
        <span class="message-detail-toggle" v-style="lineStyle" v-if="toggleContent" @click="toggleMessageDetail">{{toggleContent}}</span>
    </label>
    `
})
export class AgentConsoleMessageLineComponent {
    @Attribute() line?: AgentConsoleRenderedLine;

    constructor(private state: AgentConsoleSessionState) {}

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

    get meta(): string {
        return this.line?.meta || '';
    }

    get ariaLabel(): string {
        return this.line?.ariaLabel || '';
    }

    get metaStyle(): Record<string, string> {
        return this.line?.metaStyle || {};
    }

    get toggleContent(): string {
        return this.line?.previewCollapsed ? this.line.content : '';
    }

    toggleMessageDetail(): void {
        const messageId = String(this.line?.messageId || '').trim();
        if (!messageId) return;
        if (this.state.messageDetailOpen && this.state.selectedMessageId === messageId) {
            this.state.closeMessageDetail();
            return;
        }
        this.state.setSelectedMessageId(messageId);
        this.state.openMessageDetail(false);
    }

    get tokens(): Array<AgentConsoleMarkdownToken & { style: Record<string, string> }> {
        return this.line?.tokens || [];
    }

    get contentTokens(): Array<AgentConsoleMarkdownToken & { style: Record<string, string> }> {
        return this.line?.previewCollapsed ? [] : this.tokens;
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
    rawMode: boolean;
    showTimestamps: boolean;
    showCriticalMarks: boolean;
    showToolOutput: boolean;
    showUsername: boolean;
    timelineMode: boolean;
    messageDetailOpen: boolean;
    collapsedTurns: Record<string, boolean>;
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
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleUserMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-assistant-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleAssistantMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-tool-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleToolMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-error-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleErrorMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-system-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleSystemMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-messages-panel',
    imports: [
    ],
    template: `
    <div class="console-panel console-messages-panel" v-style="shellStyle" renderRegion="messages">
        <label class="message-empty" v-style="emptyStyle" v-show="emptyLabel">{{emptyLabel}}</label>
        <label class="message-hint" v-style="titleStyle" v-show="messagesHintLabel">{{messagesHintLabel}}</label>
        <div class="message-row" v-for="line in renderedLines">
            <label class="message-line" v-style="line.itemStyle" aria-label="{{line.ariaLabel}}">
                <span v-style="line.statusStyle">{{line.status}}</span>
                <span v-style="line.roleStyle" v-show="line.role">{{line.role}}</span>
                <span v-style="line.metaStyle" v-show="line.meta">{{line.meta}}</span>
                <span v-style="line.prefixStyle" v-show="line.prefix">{{line.prefix}}</span>
                <span class="message-detail-toggle" v-style="line.lineStyle" v-if="line.toggleContent" @click="onMessageLineClick(line)">{{line.toggleContent}}</span>
                <span v-style="line.lineStyle" v-else>{{line.content}}</span>
            </label>
        </div>
    </div>
    `
})
export class AgentConsoleMessagesPanelComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get messages(): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        // The console detail view replaces the transcript. Avoid rendering its
        // full selected message in this hidden panel while detail is open.
        if (this.state.consoleOptions.messageToggleInteraction === 'enter'
            && this.state.messageDetailOpen) {
            return [];
        }
        return this.state.displayMessages;
    }

    get shellStyle() {
        return (this.messageItems.length || this.emptyLabel)
            ? resolveSectionFrameStyle(this.activeTheme.messagesShell)
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
        if (this.state.timelineMode) {
            return this.resolveTimelineVisibleMessages(messages);
        }
        const visibleCount = this.state.consoleOptions.messagesVisibleItems;
        // MESSAGE LAYOUT CONTRACT (todo.md 2026-09-10): stream is the default
        // and must remain an unbounded transcript; dynamic is opt-in.
        if (this.state.consoleOptions.messageLayout !== 'dynamic') {
            return messages;
        }
        if (this.state.messageDetailOpen) {
            return messages;
        }
        if (!this.state.messagesFocused && messages.length > visibleCount) {
            const pinnedIndex = this.resolvePinnedRootMessageIndex(messages);
            if (pinnedIndex >= 0 && pinnedIndex < messages.length - visibleCount) {
                return [
                    messages[pinnedIndex],
                    ...messages.slice(messages.length - Math.max(visibleCount - 1, 0))
                ];
            }
        }
        const selectedIndex = Math.max(0, messages.findIndex(message => message.id === this.state.selectedMessageId));
        const window = resolveConsoleListWindow(messages.length, selectedIndex, visibleCount);
        return messages.slice(window.start, window.start + window.count);
    }

    protected resolveTimelineVisibleMessages(
        messages: Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }>
    ): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        const result = resolveTimelineWindowLedger({
            messages,
            limit: Math.max(1, this.state.consoleOptions.messagesVisibleItems),
            mode: this.state.timelineViewMode as TimelineWindowMode,
            activeScope: String(this.state.activeTurnEventScope || '').trim(),
            summaryLabels: this.state.consoleOptions.timelineLabels,
            header: this.state.sessionHeader,
            footer: this.state.sessionFooter,
            collapsedTurns: this.state.timelineCollapsedTurns
        });
        return result.items.map(item => item.message);
    }

    get messageItems(): AgentConsoleRenderedMessageItem[] {
        const messages = this.messages;
        const theme = this.activeTheme;
        const selectedMessageId = this.state.selectedMessageId;
        const messagesFocused = this.state.messagesFocused;
        const visibleItems = this.state.consoleOptions.messagesVisibleItems;
        const consoleOptions = this.state.consoleOptions;
        const rawMode = this.state.rawMode;
        const showTimestamps = this.state.consoleOptions.showMessageTimestamps && this.state.showTimestamps;
        const showCriticalMarks = this.state.showCriticalMarks;
        const showToolOutput = this.state.showToolOutput;
        const showUsername = this.state.showUsername;
        const timelineMode = this.state.timelineMode;
        const messageDetailOpen = this.state.messageDetailOpen;
        const collapsedTurns = this.state.timelineCollapsedTurns;
        const cached = messageItemsCache.get(this);

        if (cached
            && cached.messages === messages
            && cached.selectedMessageId === selectedMessageId
            && cached.messagesFocused === messagesFocused
            && cached.theme === theme
            && cached.consoleOptions === consoleOptions
            && cached.visibleItems === visibleItems
            && cached.rawMode === rawMode
            && cached.showTimestamps === showTimestamps
            && cached.showCriticalMarks === showCriticalMarks
            && cached.showToolOutput === showToolOutput
            && cached.showUsername === showUsername
            && cached.timelineMode === timelineMode
            && cached.messageDetailOpen === messageDetailOpen
            && cached.collapsedTurns === collapsedTurns) {
            return cached.items;
        }

        const items = renderAgentConsoleMessageItems(this.visibleMessages as any, {
            theme: this.activeTheme,
            selectedMessageId: this.state.selectedMessageId,
            messagesFocused: this.state.messagesFocused,
            streaming: this.state.status === 'running' || this.state.status === 'reasoning',
            statusLabels: this.state.consoleOptions.messageStatusLabels,
            statusSymbol: this.state.consoleOptions.messageStatusSymbol,
            rawMode,
            showTimestamps,
            showCriticalMarks,
            showToolOutput,
            showUsername,
            username: this.state.consoleOptions.username,
            timelineMode
        });
        messageItemsCache.set(this, {
            messages,
            selectedMessageId,
            messagesFocused,
            theme,
            consoleOptions,
            visibleItems,
            rawMode,
            showTimestamps,
            showCriticalMarks,
            showToolOutput,
            showUsername,
            timelineMode,
            messageDetailOpen,
            collapsedTurns,
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
        return this.renderedLines.map(line =>
            `${line.status || ''}${line.role || ''}${line.prefix || ''}${line.content}`
        );
    }

    get renderedLines(): AgentConsoleRenderedLine[] {
        return this.renderedMessageItems.flatMap(item => {
            const itemKey = item.lines.find(line => line.messageId)?.messageId
                || `${item.templateKind || 'message'}:${item.renderRegion || 'row'}`;
            return item.lines.map((line, lineIndex) => ({
                ...line,
                renderKey: line.messageId
                    ? `${line.messageId}:${lineIndex}`
                    : `${itemKey}:${lineIndex}`
            }));
        });
    }

    get messagesSummary(): string {
        return this.messageLabels.join(' | ');
    }

    onMessageLineClick(line?: AgentConsoleRenderedLine): void {
        const messageId = String(line?.messageId || '').trim();
        if (!messageId) {
            return;
        }
        const sameMessageSelected = this.state.selectedMessageId === messageId;
        if (sameMessageSelected && this.state.messageDetailOpen && line?.toggleContent) {
            this.state.closeMessageDetail();
            return;
        }
        if (!line?.toggleContent) {
            return;
        }
        this.state.setSelectedMessageId(messageId);
        const truncatedItem = this.renderedMessageItems.find(item =>
            item.lines.some(renderedLine => renderedLine.messageId === messageId && renderedLine.previewCollapsed)
        );
        if (!truncatedItem) {
            return;
        }
        this.state.openMessageDetail(false);
    }

    protected get renderedMessageItems(): AgentConsoleRenderedMessageItem[] {
        const streamLayout = this.state.consoleOptions.messageLayout !== 'dynamic';
        if (this.state.rawMode || this.state.showCriticalMarks) {
            return this.messageItems;
        }
        if (this.state.messagesFocused && !streamLayout) {
            return this.messageItems.map(item => {
                if (this.state.messageDetailOpen
                    && item.lines.some(line => line.messageId === this.state.selectedMessageId)) {
                    return item;
                }
                if (this.isPlanTodoMessageItem(item)
                    || this.isErrorMessageItem(item)
                    || this.isApprovalMessageItem(item)) {
                    return item;
                }
                if (this.isReasoningMessageItem(item)) {
                    return this.truncateMessageItem(item, this.state.consoleOptions.reasoningPreviewLines, false);
                }
                if (this.isEventRowMessageItem(item)) {
                    return this.truncateMessageItem(item, this.state.consoleOptions.auxiliaryPreviewLines, true);
                }
                if (item.templateKind === 'assistant' || item.templateKind === 'user') {
                    return item;
                }
                return this.truncateMessageItem(item, this.state.consoleOptions.auxiliaryPreviewLines, true);
            });
        }
        if (this.state.messageDetailOpen) {
            return this.messageItems.map(item => {
                if (!item.lines.some(line => line.messageId === this.state.selectedMessageId)) {
                    return item;
                }
                const baseLine = item.lines[item.lines.length - 1];
                const content = this.messageCollapseLabel();
                const toggleStyle = { ...(baseLine.lineStyle || {}), cursor: 'pointer' };
                return {
                    ...item,
                    lines: [...item.lines, {
                        ...baseLine,
                        previewCollapsed: true,
                        prefix: '',
                        prefixStyle: {},
                        content,
                        toggleContent: content,
                        tokens: [{ text: content, tone: 'muted', style: toggleStyle }],
                        itemStyle: {
                            ...(baseLine.itemStyle || {}),
                            padding: '1em 1ch'
                        },
                        lineStyle: toggleStyle
                    }]
                };
            });
        }
        return this.messageItems.map(item => {
            if (this.isPlanTodoMessageItem(item)
                || this.isErrorMessageItem(item)
                || this.isApprovalMessageItem(item)) {
                return item;
            }
            if (this.isReasoningMessageItem(item)) {
                return this.truncateMessageItem(item, this.state.consoleOptions.reasoningPreviewLines, false);
            }
            if (this.isEventRowMessageItem(item)) {
                return this.truncateMessageItem(item, this.state.consoleOptions.auxiliaryPreviewLines, true);
            }
            if (item.templateKind === 'assistant' || item.templateKind === 'user') {
                // 对话内容（含方案+询问的最终回复）永不折叠：对标 opencode/codex 普通回复全文展示
                return item;
            }
            return this.truncateMessageItem(item, this.state.consoleOptions.auxiliaryPreviewLines, true);
        });
    }

    protected isPlanTodoMessageItem(item: AgentConsoleRenderedMessageItem): boolean {
        return item.lines.some(line => line.messageId === '__plan_todo_inline__');
    }

    protected isReasoningMessageItem(item: AgentConsoleRenderedMessageItem): boolean {
        return item.lines.some(line => {
            const message = this.state.messages.find(candidate => candidate.id === line.messageId);
            return message?.metadata?.uiEventType === 'reasoning';
        });
    }

    protected isEventRowMessageItem(item: AgentConsoleRenderedMessageItem): boolean {
        return item.lines.some(line => {
            const message = this.state.messages.find(candidate => candidate.id === line.messageId);
            return message?.metadata?.uiKind === 'event';
        });
    }

    protected isErrorMessageItem(item: AgentConsoleRenderedMessageItem): boolean {
        return item.statusKind === 'failed'
            || item.statusKind === 'error'
            || item.templateKind === 'error';
    }

    protected isApprovalMessageItem(item: AgentConsoleRenderedMessageItem): boolean {
        return item.lines.some(line => {
            const message = this.state.messages.find(candidate => candidate.id === line.messageId);
            const uiEventType = String(message?.metadata?.uiEventType || '');
            return uiEventType === 'approval' || uiEventType === 'approval_request';
        });
    }

    protected truncateMessageItem(
        item: AgentConsoleRenderedMessageItem,
        previewLines: number = this.state.consoleOptions.auxiliaryPreviewLines,
        preserveTail = false
    ): AgentConsoleRenderedMessageItem {
        if (item.lines.length <= previewLines) {
            return item;
        }
        const questionTail = preserveTail ? this.trailingQuestionLineCount(item.lines) : 0;
        const tailLines = questionTail > 0
            ? questionTail
            : preserveTail ? Math.min(2, previewLines - 2) : 0;
        const visibleBudget = questionTail > 0 ? this.state.consoleOptions.questionTailVisibleLines : previewLines;
        const headCount = preserveTail
            ? Math.max(visibleBudget - tailLines - 1, 1)
            : previewLines;
        const head = item.lines.slice(0, headCount);
        const tail = tailLines > 0 ? item.lines.slice(-tailLines) : [];
        const hiddenCount = item.lines.length - headCount - tailLines;
        const baseLine = head[head.length - 1];
        const toggleText = this.messageExpandLabel(hiddenCount);
        const previewStyle = {
            ...(baseLine.lineStyle || {}),
            ...resolveAgentConsoleMarkdownToneStyle('muted', this.activeTheme, item.templateKind)
        };
        const toggleStyle = { ...previewStyle, cursor: 'pointer' };
        const toggleLine: AgentConsoleRenderedLine = {
            ...baseLine,
            previewCollapsed: true,
            prefix: '',
            prefixStyle: {},
            content: toggleText,
            toggleContent: toggleText,
            tokens: [{
                text: toggleText,
                tone: 'muted',
                style: toggleStyle
            }],
            itemStyle: {
                ...(baseLine.itemStyle || {}),
                padding: '1em 1ch'
            },
            lineStyle: toggleStyle
        };
        const lines = [...head, toggleLine, ...tail];
        return {
            ...item,
            lines
        };
    }

    protected trailingQuestionLineCount(lines: AgentConsoleRenderedLine[]): number {
        let count = 0;
        while (count < lines.length && /[？?]\s*$/.test(String(lines[lines.length - 1 - count]?.content || '').trimEnd())) {
            count++;
        }
        return count;
    }

    protected messageExpandLabel(hiddenCount: number): string {
        if (this.state.consoleOptions.messageToggleInteraction === 'enter') {
            return this.translator?.translate('agent.message.expandEnter', { count: hiddenCount })
                || `… ${hiddenCount} more lines. Press Enter to expand`;
        }
        return this.translator?.translate('agent.message.expand', { count: hiddenCount })
            || `… ${hiddenCount} more lines. Click to expand`;
    }

    protected messageCollapseLabel(): string {
        if (this.state.consoleOptions.messageToggleInteraction === 'enter') {
            return this.translator?.translate('agent.message.collapseEnter')
                || 'Press Enter to collapse';
        }
        return this.translator?.translate('agent.message.collapse') || 'Click to collapse';
    }

    protected resolvePinnedRootMessageIndex(
        messages: Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }>
    ): number {
        for (let index = messages.length - 1; index >= 0; index--) {
            const message = messages[index];
            if (String(message?.role || '').toLowerCase() !== 'user') {
                continue;
            }
            if (this.isRootRequestCandidate(message?.content)) {
                return index;
            }
        }
        return messages.findIndex(message => String(message?.role || '').toLowerCase() === 'user');
    }

    protected isRootRequestCandidate(content: string | undefined): boolean {
        const text = String(content || '').trim();
        if (!text) {
            return false;
        }
        if (text.startsWith('/')) {
            return false;
        }
        return !resolveFollowUpOnlyMessageRegex(this.translator)?.test(text);
    }

    protected resolveMarkdownToneStyle(tone: AgentConsoleMarkdownTone): Record<string, string> {
        return resolveAgentConsoleMarkdownToneStyle(tone, this.activeTheme);
    }
}

@Component({
    selector: 'agent-console-message-detail-panel',
    template: `
    <div class="console-panel console-message-detail-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{detailSummaryLabel}}</label>
        <label v-style="hintStyle">{{detailHintLabel}}</label>
        <label v-style="lineStyle" v-for="line in detailLines">{{line}}</label>
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
        return lines.slice(start, start + this.state.messageDetailVisibleLines);
    }

    get detailLines(): string[] {
        return this.detailIndexes.map(index => {
            const lineNumber = this.detailLineNumberAt(index);
            const prefix = this.detailLinePrefixAt(index);
            const content = this.detailLineContentAt(index);
            return `${lineNumber}${prefix}${content}`.trimEnd();
        }).filter(line => !!String(line || '').trim());
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
        return Array.from({ length: this.state.messageDetailVisibleLines }, (_value, index) => index);
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
    selector: 'agent-console-timeline-event-detail-panel',
    template: `
    <div class="console-panel console-timeline-event-detail-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{summaryLabel}}</label>
        <label v-style="hintStyle">{{hintLabel}}</label>
        <label v-style="lineStyle" v-for="index in detailIndexes">
            <span v-style="lineNumberStyle">{{detailLineNumberAt(index)}}</span><span v-style="lineContentStyle">{{detailLineContentAt(index)}}</span>
        </label>
    </div>
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

    get detailIndexes(): number[] {
        return Array.from({ length: this.state.messageDetailVisibleLines }, (_value, index) => index);
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
        const title = String(this.reviewTask?.title || this.state.selectedReviewTaskId || 'review');
        const taskId = String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim();
        const status = this.reviewTask?.status || 'unknown';
        const sourceSessionId = String(this.reviewTask?.sourceSessionId || '').trim();
        const projectLabel = String(this.state.projectLabel || '').trim();
        const executionMode = this.state.reviewExecutionMode || 'n/a';
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.reviewDetailScroll + 1);
        const end = Math.min(total, this.state.reviewDetailScroll + this.visibleLines.length);
        const column = this.state.reviewDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.state.reviewDetailMaxColumn);
        const workerCount = this.reviewWorkers.length;
        const selectedGroup = this.state.selectedReviewGroup;
        const groupCount = this.state.reviewGroups.length;
        const groupSummary = groupCount
            ? `group ${Math.min(groupCount, this.state.selectedReviewGroupIndex + 1)}/${groupCount} ${selectedGroup?.label || '-'}`
            : 'group -';
        const lineageTasks = this.state.currentReviewLineageTasks;
        const selectedTaskId = String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim();
        const lineageIndex = lineageTasks.length
            ? Math.max(0, lineageTasks.findIndex(item => item.id === selectedTaskId))
            : -1;
        const lineageRootId = this.state.resolveTaskLineageRootId(this.reviewTask || this.state.selectedTask);
        const lineageSummary = lineageTasks.length > 1 && lineageIndex >= 0
            ? `lineage ${lineageIndex + 1}/${lineageTasks.length}${lineageRootId ? ` root ${lineageRootId}` : ''}`
            : '';
        const selectedFile = this.state.selectedReviewFileSection;
        const fileCount = this.state.reviewFileSections.length;
        const fileSummary = fileCount
            ? `file ${Math.min(fileCount, this.state.selectedReviewFileIndex + 1)}/${fileCount} ${selectedFile?.path || '-'}`
            : 'file -';
        return `review ${taskId || '-'} ${title}${sourceSessionId ? `  |  session ${sourceSessionId}` : ''}${projectLabel ? `  |  project ${projectLabel}` : ''}  |  ${status}  |  ${executionMode}  |  workers ${workerCount}${lineageSummary ? `  |  ${lineageSummary}` : ''}  |  ${groupSummary}  |  ${fileSummary}  |  lines ${start}-${end} / ${total}  |  col ${column}/${totalColumns}`;
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
        const files = this.state.reviewFileSections;
        const parts = [
            `status ${this.reviewTask?.status || 'unknown'}`,
            `mode ${this.state.reviewExecutionMode || 'n/a'}`,
            `workers ${this.reviewWorkers.length}`,
            `groups ${this.state.reviewGroups.length}`,
            `files ${files.length}`,
            rollback?.available === true
                ? 'rollback available'
                : rollback?.rolledBackAt
                    ? 'rollback applied'
                    : 'rollback unavailable'
        ];
        return parts.join(' · ');
    }

    get reviewSelectionLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const selectedGroup = this.state.selectedReviewGroup;
        const selectedFile = this.state.selectedReviewFileSection;
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.reviewDetailScroll + 1);
        const end = Math.min(total, this.state.reviewDetailScroll + this.visibleLines.length);
        const column = this.state.reviewDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.state.reviewDetailMaxColumn);
        const lineageTasks = this.state.currentReviewLineageTasks;
        const selectedTaskId = String(this.reviewTask?.id || this.state.selectedReviewTaskId || '').trim();
        const lineageIndex = lineageTasks.length
            ? Math.max(0, lineageTasks.findIndex(item => item.id === selectedTaskId))
            : -1;
        const lineageRootId = this.state.resolveTaskLineageRootId(this.reviewTask || this.state.selectedTask);
        const lineageSummary = lineageTasks.length > 1 && lineageIndex >= 0
            ? `lineage ${lineageIndex + 1}/${lineageTasks.length}${lineageRootId ? ` root ${lineageRootId}` : ''}`
            : '';
        const groupCount = this.state.reviewGroups.length;
        const groupSummary = groupCount
            ? `group ${Math.min(groupCount, this.state.selectedReviewGroupIndex + 1)}/${groupCount} ${selectedGroup?.label || '-'}`
            : 'group -';
        const fileCount = this.state.reviewFileSections.length;
        const fileSummary = fileCount
            ? `file ${Math.min(fileCount, this.state.selectedReviewFileIndex + 1)}/${fileCount} ${selectedFile?.path || '-'}`
            : 'file -';
        return [
            lineageSummary,
            groupSummary,
            fileSummary,
            selectedFile ? `risk ${this.state.computeFileRiskScore(selectedFile).level}` : '',
            `lines ${start}-${end} / ${total}`,
            `col ${column}/${totalColumns}`
        ].filter(Boolean).join(' · ');
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
    template: `
    <div class="console-panel console-git-snapshot-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{gitSnapshotSummaryLabel}}</label>
        <label v-style="metaStyle" v-show="gitSnapshotStatsLabel">{{gitSnapshotStatsLabel}}</label>
        <label v-style="hintStyle">{{gitSnapshotHintLabel}}</label>
        <label v-style="detailLineStyleAt(index)" v-for="index in detailIndexes">
            <span v-style="lineNumberStyle">{{detailLineNumberAt(index)}}</span><span v-style="detailLineContentStyle">{{detailLineContentAt(index)}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleGitSnapshotPanelComponent {
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

    get detailIndexes(): number[] {
        return Array.from({ length: this.state.consoleOptions.reviewDetailVisibleLines }, (_value, index) => index);
    }

    get gitSnapshotSummaryLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        const header = this.state.gitSnapshotHeaderLabel || 'git snapshot diff';
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.gitSnapshotDetailScroll + 1);
        const end = Math.min(total, this.state.gitSnapshotDetailScroll + this.visibleLines.length);
        const column = this.state.gitSnapshotDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.gitSnapshotDetailMaxColumn);
        return `${header}  |  lines ${start}-${end} / ${total}  |  col ${column}/${totalColumns}`;
    }

    get gitSnapshotHintLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return 'up/down scroll · left/right pan · pg jump · home/end edge · r revert · y copy · esc close';
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

@Component({
    selector: 'agent-console-activity-panel',
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
        const compact = this.activities.reduce<Array<AgentConsoleActivity & { repeatCount: number }>>((items, activity) => {
            const previous = items[items.length - 1];
            if (previous?.kind === activity.kind && this.normalizedMessage(previous.message) === this.normalizedMessage(activity.message)) {
                previous.repeatCount += 1;
                previous.createdAt = activity.createdAt;
                return items;
            }
            items.push({ ...activity, repeatCount: 1 });
            return items;
        }, []);
        return compact.slice(-this.state.consoleOptions.activityVisibleItems).map(activity => ({
            kind: `${this.activityKindLabel(activity.kind)} `,
            message: `${this.summarize(activity.message)}${activity.repeatCount > 1 ? ` ×${activity.repeatCount}` : ''}`,
            kindStyle: this.activityKindStyle(activity.kind),
            messageStyle: this.activityMessageStyle(activity.kind)
        }));
    }

    protected activityKindStyle(kind: AgentConsoleActivity['kind']): Record<string, string> {
        if (kind === 'error') {
            return styleTextToObject(this.activeTheme.statusErrorLabel);
        }
        if (kind === 'rollback') {
            return styleTextToObject(this.activeTheme.statusNoticeLabel);
        }
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    protected activityMessageStyle(kind: AgentConsoleActivity['kind']): Record<string, string> {
        if (kind === 'error') {
            return styleTextToObject(this.activeTheme.statusErrorValue);
        }
        if (kind === 'model') {
            return styleTextToObject(this.activeTheme.statusLabel);
        }
        return styleTextToObject(this.activeTheme.statusValue);
    }

    protected activityKindLabel(kind: string): string {
        switch (kind) {
            case 'tool': return '›';
            case 'model': return '·';
            case 'error': return 'error:';
            case 'rollback': return '<';
            default: return '·';
        }
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
        const text = this.normalizedMessage(value);
        return text.length > this.state.consoleOptions.summaryMaxLength
            ? `${text.slice(0, Math.max(1, this.state.consoleOptions.summaryMaxLength - 1)).trimEnd()}…`
            : text;
    }

    protected normalizedMessage(value: string): string {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }
}

@Component({
    selector: 'agent-console-select-panel',
    template: `
        <div class="console-panel console-select-panel" role="dialog" aria-label="{{accessibilityLabel}}">
            <div class="select-shell" v-style="shellStyle">
            <select class="select-core"
                aria-label="{{accessibilityLabel}}"
                options="{{menuOptionsJson}}"
                selectedIndex="{{menuSelectedIndexText}}"
                visibleCount="{{visibleOptionCountText}}"
                detailLines="{{menuDetailLinesJson}}"
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

    get menuDetailLines(): string[] {
        const detail = this.state.selectedSelectMenuOption?.detail;
        if (typeof detail !== 'string') {
            return [];
        }
        const cap = Math.max(1, this.state.consoleOptions.selectDetailVisibleLines || 6);
        return detail.split('\n').map(line => line.trim()).filter(Boolean).slice(0, cap);
    }

    get menuDetailLinesJson(): string {
        const lines = this.menuDetailLines;
        return lines.length ? JSON.stringify(lines) : '';
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

    get accessibilityLabel(): string {
        if (!this.menu) {
            return 'Selection menu';
        }
        return `${this.menu.title || 'Selection menu'}. ${this.menu.options.length} options. Selected ${this.menu.selectedIndex + 1} of ${this.menu.options.length}.`;
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

@Component({
    selector: 'agent-console-which-key-panel',
    template: `
    <div class="console-panel console-which-key-panel" v-style="shellStyle">
        <label class="which-key-title" v-style="titleStyle">{{titleText}}</label>
        <template v-if="isGrouped">
            <template v-for="group in groupedBindings">
                <label class="which-key-group-header" v-style="groupHeaderStyle">{{group.label}}</label>
                <label class="which-key-row" v-style="rowStyle" v-for="binding in group.items">
                    <span v-style="keyStyle">{{binding.key}}</span>
                    <span v-style="actionStyle"> {{binding.action}}</span>
                </label>
            </template>
        </template>
        <template v-else>
            <label class="which-key-row" v-style="rowStyle" v-for="binding in bindings">
                <span v-style="keyStyle">{{binding.key}}</span>
                <span v-style="actionStyle"> {{binding.action}}</span>
            </label>
        </template>
        <label class="which-key-hint" v-style="hintStyle">{{hintText}}</label>
    </div>
    `
})
export class AgentConsoleWhichKeyPanelComponent {
    private static readonly ACTION_GROUPS: Record<string, string> = {
        'new-session': 'Session', 'compact': 'Session', 'export': 'Session', 'undo': 'Session', 'redo': 'Session', 'sessions': 'Session', 'fork': 'Session', 'archive': 'Session',
        'theme': 'Display', 'timeline-mode': 'Display', 'toggle-thinking': 'Display', 'status': 'Display',
        'model': 'Model', 'archetypes': 'Model', 'model-favorite-toggle': 'Model', 'model-cycle-recent': 'Model', 'model-cycle-recent-back': 'Model', 'model-variant-cycle': 'Model',
        'thread-child-first': 'Thread', 'thread-cycle-next': 'Thread', 'thread-cycle-prev': 'Thread', 'thread-parent': 'Thread',
        'message-page-up': 'Navigate', 'message-page-down': 'Navigate', 'message-half-page-up': 'Navigate', 'message-half-page-down': 'Navigate', 'message-line-up': 'Navigate', 'message-line-down': 'Navigate', 'message-first': 'Navigate', 'message-last': 'Navigate', 'message-last-user': 'Navigate',
        'copy': 'Edit', 'open-editor': 'Edit',
        'command-palette': 'UI', 'which-key-toggle': 'UI', 'which-key-layout-toggle': 'UI', 'which-key-pending-toggle': 'UI', 'status-health': 'UI', 'interrupt-turn': 'Control'
    };

    constructor(
        private state: AgentConsoleSessionState
    ) {
    }

    get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || defaultAgentConsoleTheme;
    }

    get bindings(): Array<{ key: string; action: string }> {
        return this.state.whichKeyBindings;
    }

    get bindingCount(): string {
        return String(this.bindings.length);
    }

    get isGrouped(): boolean {
        return this.state.whichKeyLayout === 'grouped';
    }

    get groupedBindings(): Array<{ label: string; items: Array<{ key: string; action: string }> }> {
        const groups = new Map<string, Array<{ key: string; action: string }>>();
        for (const b of this.bindings) {
            const label = AgentConsoleWhichKeyPanelComponent.ACTION_GROUPS[b.action] || 'Other';
            let arr = groups.get(label);
            if (!arr) { arr = []; groups.set(label, arr); }
            arr.push(b);
        }
        return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
    }

    get titleText(): string {
        const total = this.bindingCount;
        const page = this.state.whichKeyPage;
        const layout = this.state.whichKeyLayout;
        const filter = this.state.whichKeyFilterCustom ? ' [custom]' : '';
        const pageStr = page > 0 ? ` p${page + 1}` : '';
        const layoutIcon = layout === 'grouped' ? ' grouped' : '';
        return `Keymap (${total})${layoutIcon}${filter}${pageStr}`;
    }

    get hintText(): string {
        const hints = ['Esc close'];
        if (this.state.whichKeyPage > 0) hints.push('p prev');
        hints.push('n next');
        hints.push('L layout');
        hints.push('F filter');
        return hints.join(' · ');
    }

    get groupHeaderStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get shellStyle() {
        return styleTextToObject(this.activeTheme.selectShell);
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get rowStyle() {
        return styleTextToObject(this.activeTheme.selectOption);
    }

    get keyStyle() {
        return styleTextToObject(this.activeTheme.selectOptionActive);
    }

    get actionStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }
}

@Component({
    selector: 'agent-console-health-popover',
    template: `
    <div class="console-panel console-health-popover" v-style="shellStyle">
        <label class="health-title" v-style="titleStyle">Health ({{itemCount}})</label>
        <label class="health-row" v-style="rowStyle" v-for="item in items">
            <span v-style="statusStyle(item.status)">{{statusLabel(item.status)}}</span>
            <span v-style="labelStyle"> {{item.label}}</span>
            <span v-style="detailStyle"> {{item.detail}}</span>
        </label>
        <label class="health-hint" v-style="hintStyle">{{hintText}}</label>
    </div>
    `
})
export class AgentConsoleHealthPopoverComponent {
    constructor(
        private state: AgentConsoleSessionState
    ) {
    }

    get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || defaultAgentConsoleTheme;
    }

    get items(): AgentConsoleHealthItem[] {
        return this.state.healthItems;
    }

    get itemCount(): string {
        return String(this.items.length);
    }

    get hintText(): string {
        return 'Ctrl+X H to toggle · hover to refresh';
    }

    statusLabel(status: AgentConsoleHealthStatus): string {
        switch (status) {
            case 'ok': return 'ok';
            case 'warn': return 'warn';
            case 'error': return 'error';
            default: return 'unknown';
        }
    }

    statusStyle(status: AgentConsoleHealthStatus) {
        const style = status === 'ok'
            ? this.activeTheme.statusIdleValue
            : status === 'warn'
                ? this.activeTheme.statusNoticeValue
                : status === 'error'
                    ? this.activeTheme.statusErrorValue
                    : this.activeTheme.statusValue;
        return styleTextToObject(style);
    }

    get shellStyle() {
        return styleTextToObject(this.activeTheme.selectShell);
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get rowStyle() {
        return styleTextToObject(this.activeTheme.selectOption);
    }

    get labelStyle() {
        return styleTextToObject(this.activeTheme.selectOptionActive);
    }

    get detailStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }
}
