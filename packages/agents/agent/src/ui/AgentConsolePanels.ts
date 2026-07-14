import { Attribute, Component, AfterViewInit, OnDestroy, ComponentRef, ElementRef } from '@tsdi/components';
import {
    BrDirective,
    DivDirective,
    formatConsoleIndexedOptionLabel,
    LabelComponent,
    resolveConsoleListWindow,
    SpanDirective,
    TuiSelectComponent,
    TuiTextareaComponent,
    resolveConsoleEnterAction,
    resolveConsoleSelectDetailLines,
    resolveConsoleSelectWindow,
    syncConsoleEditableElement
} from '@tsdi/components/console';
import { Inject, Optional } from '@tsdi/ioc';
import { DOCUMENT } from '@tsdi/common';
import {
    AgentConsoleActivity,
    AgentConsoleSelectOption,
    AgentConsoleSessionItem,
    AgentConsoleSelectMenu,
    AgentConsoleSessionState,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun
} from './AgentConsoleSessionState';
import { AgentConsoleTheme, defaultAgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';

const CONSOLE_BASE_IMPORTS = [DivDirective, LabelComponent, SpanDirective, BrDirective];
const CONSOLE_FORM_IMPORTS = [TuiTextareaComponent, TuiSelectComponent, ...CONSOLE_BASE_IMPORTS];

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
        if (this.notice) {
            return this.notice;
        }
        if (this.state.lastError) {
            return `Error: ${this.lastErrorLabel}`;
        }
        return '';
    }

    get workspaceSummary(): string {
        return this.workspace || '-';
    }

    get shellStyle() {
        return this.shouldShow ? styleTextToObject(this.activeTheme.statusShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.statusTitle);
    }

    get valueStyle() {
        return styleTextToObject(this.activeTheme.statusValue);
    }

    get runningToolsLabel(): string {
        return this.state.runningTools.length ? this.state.runningTools.join(', ') : 'none';
    }

    get lastErrorLabel(): string {
        return this.state.lastError || 'none';
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
            .slice(0, 6);
    }

    get shouldShow(): boolean {
        return !!this.notice;
    }

    statusLineAt(index: number): string {
        return this.statusLines[index] || '';
    }

    get runningStyle() {
        return styleTextToObject(this.state.runningTools.length ? this.activeTheme.statusBusyValue : this.activeTheme.statusIdleValue);
    }

    get errorStyle() {
        return styleTextToObject(this.state.lastError ? this.activeTheme.statusErrorValue : this.activeTheme.statusLabel);
    }

    get noticeStyle() {
        return styleTextToObject(this.activeTheme.statusNoticeValue);
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
                    prompt="> "
                    placeholder="{{placeholderLabel}}"
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
        <label class="input-hint" v-style="hintStyle">{{hintLabel}}</label>
    </div>
    `
})
export class AgentConsoleInputPanelComponent implements AfterViewInit, OnDestroy {
    protected unsubscribeState?: () => void;
    protected currentInput = '';
    protected currentCursor = 0;
    protected currentFocused = true;

    constructor(
        private state?: AgentConsoleSessionState,
        private elementRef?: ElementRef<any>,
        @Optional() private componentRef?: ComponentRef<AgentConsoleInputPanelComponent> | null,
        @Optional() @Inject(DOCUMENT) private document?: Document | null
    ) {
        this.currentInput = state?.input || '';
        this.currentCursor = state?.inputCursor ?? this.currentInput.length;
        this.currentFocused = state?.inputFocused !== false;
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() submitAction?: () => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    onAfterViewInit(): void {
        this.currentInput = this.state?.input || '';
        this.currentCursor = this.state?.inputCursor ?? this.currentInput.length;
        this.currentFocused = this.state?.inputFocused !== false;
        this.unsubscribeState = this.state?.subscribe(() => {
            this.currentInput = this.state?.input || '';
            this.currentCursor = this.state?.inputCursor ?? this.currentInput.length;
            this.currentFocused = this.state?.inputFocused !== false;
            const renderTask = this.componentRef?.render?.();
            if (renderTask && typeof (renderTask as Promise<void>).then === 'function') {
                void (renderTask as Promise<void>).then(() => this.syncNativeInput());
            } else {
                this.syncNativeInput();
            }
        });
        this.syncNativeInput();
    }

    onDestroy(): void {
        this.unsubscribeState?.();
        this.unsubscribeState = undefined;
    }

    get input(): string {
        return this.currentInput;
    }

    set input(value: string) {
        this.currentInput = value;
        this.currentCursor = value.length;
        this.state?.setInput(value, value.length);
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.inputTitle);
    }

    get inputCursor(): number {
        return this.currentCursor;
    }

    get inputFocused(): boolean {
        return this.currentFocused;
    }

    get shellStyle() {
        return styleTextToObject(this.activeTheme.inputShell);
    }

    get captionStyle() {
        return styleTextToObject(this.activeTheme.inputCaption);
    }

    get placeholderLabel(): string {
        return this.input ? '' : 'Ask code or files';
    }

    get entryStyle() {
        return styleTextToObject(this.activeTheme.inputField);
    }

    get entryShellStyle() {
        return styleTextToObject(this.activeTheme.inputEntry);
    }

    get promptStyle() {
        return styleTextToObject(this.activeTheme.inputPrompt);
    }

    get fieldStyle() {
        return styleTextToObject(this.activeTheme.inputField);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.inputHint);
    }

    get hintLabel(): string {
        const parts = [
            this.modelLabel,
            this.shortWorkspaceLabel
        ].filter(Boolean);
        return parts.join(' · ');
    }

    get modelLabel(): string {
        const model = this.state?.model || 'model';
        const profile = String(this.state?.modelProfile || '').trim();
        return profile ? `${model} ${profile}` : model;
    }

    get shortWorkspaceLabel(): string {
        const workspace = String(this.state?.workspace || '').trim();
        if (!workspace) {
            return '';
        }
        const home = typeof process !== 'undefined' ? (process.env.HOME || '') : '';
        if (home && workspace.startsWith(home)) {
            return `~${workspace.slice(home.length)}`;
        }
        return workspace;
    }

    async submit(): Promise<void> {
        await (this.submitAction || this.state?.submitAction)?.();
    }

    onInput(event: Event): void {
        const target = event?.target as HTMLTextAreaElement | null;
        const value = String(target?.value || '');
        const cursor = typeof target?.selectionStart === 'number'
            ? target.selectionStart
            : value.length;
        this.currentInput = value;
        this.currentCursor = cursor;
        this.state?.setInput(value, cursor);
        this.syncNativeInput();
    }

    onCursorChange(event: Event): void {
        const target = event?.target as HTMLTextAreaElement | null;
        if (typeof target?.selectionStart === 'number') {
            this.currentCursor = target.selectionStart;
            this.state?.setInputCursor(target.selectionStart);
        }
    }

    onFocus(): void {
        this.currentFocused = true;
        this.state?.setInputFocused(true);
        this.syncNativeInput();
    }

    onBlur(): void {
        this.currentFocused = false;
        this.state?.setInputFocused(false);
        this.syncNativeInput();
    }

    async onKeydown(event: KeyboardEvent): Promise<void> {
        if (this.state?.selectMenu) {
            if (event.key === 'ArrowDown') {
                event.preventDefault?.();
                this.state.moveSelectMenu(1);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault?.();
                this.state.moveSelectMenu(-1);
                return;
            }
            if (event.key === 'Tab') {
                event.preventDefault?.();
                await this.state.confirmSelectMenu();
                return;
            }
            if (event.key === 'Enter') {
                event.preventDefault?.();
                await this.state.processRawChunk('\r', {
                    submitOnEnter: true,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    hasSelectMenu: true
                });
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault?.();
                await this.state.cancelSelectMenu();
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

    protected syncNativeInput(): void {
        const host = (this.elementRef?.nativeElement || this.componentRef?.hostView?.rootNodes?.[0] || this.componentRef?.elementRef?.nativeElement) as any;
        const candidates = Array.from(host?.querySelectorAll?.('.agent-input') || []);
        if (host?.classList?.contains?.('agent-input')) {
            candidates.push(host);
        }
        const ownerDocument = host?.ownerDocument || this.document;
        if (!candidates.length && ownerDocument?.querySelectorAll) {
            candidates.push(...Array.from(ownerDocument.querySelectorAll('.agent-input')));
        }
        candidates.forEach((input: any) => {
            syncConsoleEditableElement(input, {
                value: this.currentInput,
                cursor: this.currentCursor,
                focused: this.currentFocused
            });
        });
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
export class AgentConsoleWorkingPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
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

    get shellStyle() {
        return this.shouldShow ? styleTextToObject(this.activeTheme.workingShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.workingTitle);
    }

    get lineStyle() {
        return styleTextToObject(this.activeTheme.workingValue);
    }

    get labelStyle() {
        return styleTextToObject(this.activeTheme.workingLabel);
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
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
        const parts = [`(${this.elapsedLabel} • esc to interrupt)`];
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
        const frame = Number.parseInt(String(this.state.workingFrame || '0'), 10);
        const safeFrame = Number.isFinite(frame) ? Math.max(0, frame) : 0;
        return safeFrame % Math.max(this.animatedLabel.length, 1);
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
    protected static readonly VISIBLE_SESSIONS = 6;

    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get sessions(): AgentConsoleSessionItem[] {
        return this.state.sessions;
    }

    get shellStyle() {
        return this.shouldShow ? styleTextToObject(this.activeTheme.sessionsShell) : {};
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.sessionsAccent);
    }

    get metaStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
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
            return {
                id: session.id,
                label: `${marker} ${session.id}${current}${count}`,
                style: selected
                    ? styleTextToObject(this.activeTheme.sessionsSelected)
                    : styleTextToObject(this.activeTheme.statusValue)
            };
        });
    }

    get visibleSessionStart(): number {
        const selectedIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.state.selectedSessionId));
        return resolveConsoleListWindow(
            this.sessions.length,
            selectedIndex,
            AgentConsoleSessionsPanelComponent.VISIBLE_SESSIONS
        ).start;
    }

    get visibleSessions(): AgentConsoleSessionItem[] {
        return this.sessions.slice(
            this.visibleSessionStart,
            this.visibleSessionStart + AgentConsoleSessionsPanelComponent.VISIBLE_SESSIONS
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
        return 'up/down move   pg jump   enter switch   y copy   esc';
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
}

@Component({
    selector: 'agent-console-tools-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-tools-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{toolsSummaryLabel}}</label>
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

    get tools(): AgentConsoleToolItem[] {
        return this.state.tools;
    }

    get shellStyle() {
        return this.shouldShow ? styleTextToObject(this.activeTheme.toolsShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.toolsTitle);
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get toolLabels(): string[] {
        if (!this.shouldShow) {
            return [];
        }
        return this.tools.slice(0, 4).map(tool => `${tool.name}${tool.active ? '' : ' [inactive]'}${tool.toolset ? ` (${tool.toolset})` : ''}`);
    }

    get toolsSummary(): string {
        return this.toolLabels.join(' | ');
    }

    get toolsSummaryLabel(): string {
        return this.shouldShow
            ? `tools ${this.tools.length}  |  ${this.toolsSummary}`
            : '';
    }

    get shouldShow(): boolean {
        return false;
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

    get toolRuns(): AgentConsoleToolRun[] {
        return this.state.toolRuns;
    }

    get highlightedToolRun(): AgentConsoleToolRun | undefined {
        return this.state.highlightedToolRun;
    }

    get shellStyle() {
        return this.toolRunsSummaryLabel ? styleTextToObject(this.activeTheme.toolRunsShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.toolRunsTitle);
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolRunsAccent);
    }

    get toolRunLabels(): string[] {
        return this.toolRuns.slice(0, 3).map(run => {
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
            return '-';
        }
        return this.highlightedToolRun.inputSummary || '-';
    }

    get highlightedToolRunOutput(): string {
        if (!this.highlightedToolRun) {
            return '-';
        }
        return this.highlightedToolRun.outputSummary || this.highlightedToolRun.error || '-';
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
        return text.length > 96 ? `${text.slice(0, 96)}...` : text;
    }
}

@Component({
    selector: 'agent-console-messages-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-messages-panel" v-style="shellStyle">
        <label class="message-empty" v-style="emptyStyle" v-show="emptyLabel">{{emptyLabel}}</label>
        <label class="message-hint" v-style="titleStyle" v-show="messagesHintLabel">{{messagesHintLabel}}</label>
        <label class="message-item" v-style="item.itemStyle" v-for="item in messageItems">
            <span v-style="item.roleStyle">{{item.role}}</span>
            <span v-style="item.contentStyle">{{item.content}}</span>
        </label>
    </div>
    `
})
export class AgentConsoleMessagesPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get messages(): Array<{ id?: string; role?: string; content: string }> {
        return this.state.messages;
    }

    get shellStyle() {
        return (this.messageItems.length || this.emptyLabel) ? styleTextToObject(this.activeTheme.messagesShell) : {};
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

    get visibleMessages(): Array<{ id?: string; role?: string; content: string }> {
        const messages = this.messages;
        const selectedIndex = Math.max(0, messages.findIndex(message => message.id === this.state.selectedMessageId));
        const window = resolveConsoleListWindow(messages.length, selectedIndex, 7);
        return messages.slice(window.start, window.start + window.count);
    }

    get messageItems(): Array<{ kind: string; role: string; content: string; selected: boolean; itemStyle: Record<string, string>; roleStyle: Record<string, string>; contentStyle: Record<string, string> }> {
        return this.visibleMessages.map(message => {
            const role = this.getMessageRoleLabel(message.role);
            const selected = message.id === this.state.selectedMessageId;
            const summary = this.summarizeMessage(message.content, role);
            const rowSelected = selected && this.state.messagesFocused;
            const rowStyleText = selected && this.state.messagesFocused
                ? this.activeTheme.messagesSelected
                : role === 'you'
                    ? this.activeTheme.messagesUser
                    : this.activeTheme.messagesShell;
            const itemStyle = {
                padding: '0 1',
                ...(rowStyleText ? styleTextToObject(rowStyleText) : {})
            };
            if (role === 'you') {
                return {
                    kind: role,
                    role: '› ',
                    content: summary,
                    selected,
                    itemStyle,
                    roleStyle: rowSelected ? {} : styleTextToObject(this.activeTheme.statusValue),
                    contentStyle: rowSelected ? {} : styleTextToObject(this.activeTheme.statusValue)
                };
            }
            return {
                kind: role,
                role: rowSelected ? '› ' : '',
                content: summary,
                selected,
                itemStyle,
                roleStyle: rowSelected ? {} : styleTextToObject(this.resolveMessageRoleStyle(role)),
                contentStyle: rowSelected ? {} : styleTextToObject(this.activeTheme.statusValue)
            };
        });
    }

    get messagesHintLabel(): string {
        if (!this.messages.length) {
            return '';
        }
        return this.state.messagesFocused
            ? 'up/down move   pg jump   enter open   y copy   esc'
            : '';
    }

    get messageLabels(): string[] {
        return this.messageItems.map(item => `${item.role}${item.content}`);
    }

    get messagesSummary(): string {
        return this.messageLabels.join(' | ');
    }

    messageAt(index: number): { kind: string; role: string; content: string; selected: boolean; itemStyle: Record<string, string>; roleStyle: Record<string, string>; contentStyle: Record<string, string> } | undefined {
        return this.messageItems[index];
    }

    hasMessageAt(index: number): boolean {
        return !!this.messageAt(index);
    }

    messageKindAt(index: number): string {
        return this.messageAt(index)?.kind || '';
    }

    messageRoleAt(index: number): string {
        return this.messageAt(index)?.role || '';
    }

    messageContentAt(index: number): string {
        return this.messageAt(index)?.content || '';
    }

    messageSelectedAt(index: number): boolean {
        return !!this.messageAt(index)?.selected;
    }

    messageItemStyleAt(index: number): Record<string, string> {
        return this.messageAt(index)?.itemStyle || {};
    }

    messageRoleStyleAt(index: number): Record<string, string> {
        return this.messageAt(index)?.roleStyle || {};
    }

    messageContentStyleAt(index: number): Record<string, string> {
        return this.messageAt(index)?.contentStyle || {};
    }

    protected getMessageRoleLabel(role?: string): string {
        switch (String(role || '').toLowerCase()) {
            case 'user':
                return 'you';
            case 'assistant':
                return 'agent';
            default:
                return String(role || 'system').toLowerCase();
        }
    }

    protected summarize(value: string): string {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        return text.length > 80 ? `${text.slice(0, 80)}...` : text;
    }

    protected summarizeMessage(value: string, role: string): string {
        const summary = this.summarize(value);
        if (summary) {
            return summary;
        }
        return role === 'agent' ? '…' : '';
    }

    protected resolveMessageRoleStyle(role: string): string {
        switch (role) {
            case 'you':
                return this.activeTheme.messagesUser;
            case 'agent':
                return this.activeTheme.toolsAccent;
            default:
                return this.activeTheme.statusLabel;
        }
    }
}

@Component({
    selector: 'agent-console-message-detail-panel',
    imports: CONSOLE_BASE_IMPORTS,
    template: `
    <div class="console-panel console-message-detail-panel" v-style="shellStyle">
        <label v-style="accentStyle">{{detailSummaryLabel}}</label>
        <label v-style="hintStyle">{{detailHintLabel}}</label>
        <label v-for="index in detailIndexes">
            <span v-style="lineNumberStyle">{{detailLineNumberAt(index)}}</span>
            <span v-style="lineStyle">{{detailLineContentAt(index)}}</span>
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
        return this.shouldShow ? styleTextToObject(this.activeTheme.messagesShell) : {};
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get lineStyle() {
        return styleTextToObject(this.activeTheme.statusValue);
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
        return lines.slice(start, start + 6);
    }

    get detailSummaryLabel(): string {
        if (!this.shouldShow || !this.selectedMessage) {
            return '';
        }
        const role = String(this.selectedMessage.role || 'system').toLowerCase();
        const selectedIndex = Math.max(0, this.state.messages.findIndex(item => item.id === this.selectedMessage?.id));
        const total = this.contentLines.length;
        const start = Math.min(total, this.state.messageDetailScroll + 1);
        const end = Math.min(total, this.state.messageDetailScroll + this.visibleLines.length);
        const column = this.state.messageDetailColumnScroll + 1;
        const totalColumns = Math.max(1, this.state.messageDetailMaxColumn);
        return `message ${selectedIndex + 1}/${this.state.messages.length} ${role}  |  lines ${start}-${end} / ${total}  |  col ${column}/${totalColumns}`;
    }

    get detailHintLabel(): string {
        if (!this.shouldShow || !this.selectedMessage) {
            return '';
        }
        return this.state.messageDetailOpen
            ? 'up/down scroll   left/right pan   pg jump   y copy   esc'
            : 'enter to open';
    }

    get detailIndexes(): number[] {
        return [0, 1, 2, 3, 4, 5];
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
        return this.state.activities;
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
        return this.activities.slice(-3).map(activity => ({
            kind: `${activity.kind}: `,
            message: this.summarize(activity.message),
            kindStyle: styleTextToObject(this.activeTheme.toolsAccent),
            messageStyle: styleTextToObject(this.activeTheme.statusValue)
        }));
    }

    get shouldShow(): boolean {
        return !this.state.messages.length && this.activities.length > 0;
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
        return text.length > 80 ? `${text.slice(0, 80)}...` : text;
    }
}

@Component({
    selector: 'agent-console-select-panel',
    imports: CONSOLE_FORM_IMPORTS,
    template: `
    <div class="console-panel console-select-panel">
        <div class="select-shell" v-style="shellStyle">
            <select class="select-core"
                title="{{menuTitle}}"
                meta="{{menuMeta}}"
                hint="{{menuHint}}"
                options="{{menuOptionsJson}}"
                selectedIndex="{{menuSelectedIndexText}}"
                visibleCount="{{visibleOptionCountText}}"
                detailTitle="{{detailTitle}}"
                detailLines="{{detailLinesJson}}"
                titleStyle="{{activeTheme.selectHeader}}"
                metaStyle="{{activeTheme.selectDetailLabel}}"
                hintStyle="{{activeTheme.selectHint}}"
                optionActiveStyle="{{activeTheme.selectOptionActive}}"
                optionStyle="{{activeTheme.selectOption}}"
                detailLabelStyle="{{activeTheme.selectDetailLabel}}"
                detailValueStyle="{{activeTheme.selectDetailValue}}"></select>
        </div>
    </div>
    `
})
export class AgentConsoleSelectPanelComponent implements AfterViewInit, OnDestroy {
    protected static readonly VISIBLE_OPTIONS = 12;
    protected unsubscribeState?: () => void;
    protected currentMenu?: AgentConsoleSelectMenu;

    constructor(
        private state: AgentConsoleSessionState
    ) {
        this.currentMenu = this.state.selectMenu;
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() selectAction?: (value: string) => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    onAfterViewInit(): void {
        this.currentMenu = this.state.selectMenu;
        this.unsubscribeState = this.state.subscribe(() => {
            this.currentMenu = this.state.selectMenu;
        });
    }

    onDestroy(): void {
        this.unsubscribeState?.();
        this.unsubscribeState = undefined;
    }

    get menu(): AgentConsoleSelectMenu | undefined {
        return this.currentMenu;
    }

    get shellStyle() {
        return this.menu ? styleTextToObject(this.activeTheme.selectShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.selectTitle);
    }

    get headerStyle() {
        return styleTextToObject(this.activeTheme.selectHeader);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.selectHint);
    }

    get detailLabelStyle() {
        return styleTextToObject(this.activeTheme.selectDetailLabel);
    }

    get detailValueStyle() {
        return styleTextToObject(this.activeTheme.selectDetailValue);
    }

    get menuTitle(): string {
        return this.menu ? this.menu.title : '';
    }

    get menuHint(): string {
        return this.menu
            ? (this.menu.hint ? this.menu.hint : 'up/down move   enter confirm   esc close')
            : '';
    }

    get menuMeta(): string {
        if (!this.menu || !this.menu.options.length) {
            return '';
        }
        return `${this.menu.selectedIndex + 1}/${this.menu.options.length}`;
    }

    get menuOptions(): AgentConsoleSelectOption[] {
        return this.menu?.options || [];
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
        return String(AgentConsoleSelectPanelComponent.VISIBLE_OPTIONS);
    }

    get visibleOptionStart(): number {
        if (!this.menu) {
            return 0;
        }
        return resolveConsoleSelectWindow(
            this.menu.options.length,
            this.menu.selectedIndex,
            AgentConsoleSelectPanelComponent.VISIBLE_OPTIONS
        ).start;
    }

    get visibleMenuOptions(): AgentConsoleSelectOption[] {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.slice(this.visibleOptionStart, this.visibleOptionStart + AgentConsoleSelectPanelComponent.VISIBLE_OPTIONS);
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

    get selectedOption() {
        if (!this.menu) {
            return undefined;
        }
        return this.menu.options[this.menu.selectedIndex];
    }

    get detailTitle(): string {
        return this.selectedOption ? 'Preview' : '';
    }

    get detailLines(): string[] {
        return resolveConsoleSelectDetailLines(this.selectedOption as any);
    }

    get detailLinesJson(): string {
        return JSON.stringify(this.detailLines);
    }

    detailLineAt(index: number): string {
        return this.detailLines[index] || '';
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
}
