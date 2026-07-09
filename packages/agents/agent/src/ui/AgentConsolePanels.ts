import { Attribute, Component, OnDestroy, AfterViewInit } from '@tsdi/components';
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

@Component({
    selector: 'agent-console-status-panel',
    template: `
    <section class="console-panel console-status-panel" v-style="shellStyle">
        <p class="status-line" v-style="statusStyle" v-show="statusLineAt(0)">{{statusLineAt(0)}}</p>
        <p class="status-line" v-style="statusStyle" v-show="statusLineAt(1)">{{statusLineAt(1)}}</p>
        <p class="status-line" v-style="statusStyle" v-show="statusLineAt(2)">{{statusLineAt(2)}}</p>
        <p class="status-line" v-style="statusStyle" v-show="statusLineAt(3)">{{statusLineAt(3)}}</p>
        <p class="status-line" v-style="statusStyle" v-show="statusLineAt(4)">{{statusLineAt(4)}}</p>
        <p class="status-line" v-style="statusStyle" v-show="statusLineAt(5)">{{statusLineAt(5)}}</p>
    </section>
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
    template: `
    <section class="console-panel console-input-panel">
        <div class="input-shell" v-style="shellStyle">
            <p class="input-entry" v-style="entryShellStyle">
                <span class="input-prompt" v-style="promptStyle">&gt; </span>
                <span class="input-placeholder" v-style="captionStyle">{{placeholderLabel}}</span>
                <input class="agent-input" v-style="fieldStyle" v-model="input" @keyup="onKeyup($event)" />
            </p>
        </div>
        <p class="input-hint" v-style="hintStyle">{{hintLabel}}</p>
    </section>
    `
})
export class AgentConsoleInputPanelComponent implements AfterViewInit, OnDestroy {
    protected unsubscribeState?: () => void;
    protected currentInput = '';

    constructor(
        private state?: AgentConsoleSessionState
    ) {
        this.currentInput = state?.input || '';
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() submitAction?: () => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    onAfterViewInit(): void {
        this.currentInput = this.state?.input || '';
        this.unsubscribeState = this.state?.subscribe(() => {
            this.currentInput = this.state?.input || '';
        });
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
        this.state?.setInput(value);
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.inputTitle);
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

    async onKeyup(event: KeyboardEvent): Promise<void> {
        if (event.key !== 'Enter') {
            return;
        }
        await this.submit();
    }
}

@Component({
    selector: 'agent-console-working-panel',
    template: `
    <section class="console-panel console-working-panel" v-style="shellStyle">
        <p class="working-line">
            <span v-style="accentStyle">{{workingLabel}}</span>
            <span v-style="lineStyle">{{workingDetail}}</span>
        </p>
    </section>
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

    get workingSummary(): string {
        if (!this.shouldShow) {
            return '';
        }
        return `${this.workingLabel}${this.workingDetail}`;
    }

    get workingLabel(): string {
        if (!this.shouldShow) {
            return '';
        }
        return `${this.state.workingFrame} ${this.workingStateLabel}${this.workingPulseLabel}`;
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

    get workingStateLabel(): string {
        const running = this.state.runningTools;
        if (!running.length) {
            return 'Working';
        }
        if (running.length === 1) {
            return `Waiting for ${this.describeTool(running[0])}`;
        }
        return 'Waiting for tools';
    }

    get workingPulseLabel(): string {
        switch (this.state.workingFrame) {
            case '◌':
                return '.';
            case '◎':
                return '..';
            case '◉':
                return '...';
            default:
                return '';
        }
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
    template: `
    <section class="console-panel console-sessions-panel" v-style="shellStyle">
        <p v-style="accentStyle">{{sessionsSummaryLabel}}</p>
        <p v-style="metaStyle" v-show="sessionsHintLabel">{{sessionsHintLabel}}</p>
        <p v-style="sessionStyleAt(0)" v-show="sessionLabelAt(0)">{{sessionLabelAt(0)}}</p>
        <p v-style="sessionStyleAt(1)" v-show="sessionLabelAt(1)">{{sessionLabelAt(1)}}</p>
        <p v-style="sessionStyleAt(2)" v-show="sessionLabelAt(2)">{{sessionLabelAt(2)}}</p>
        <p v-style="sessionStyleAt(3)" v-show="sessionLabelAt(3)">{{sessionLabelAt(3)}}</p>
        <p v-style="sessionStyleAt(4)" v-show="sessionLabelAt(4)">{{sessionLabelAt(4)}}</p>
        <p v-style="sessionStyleAt(5)" v-show="sessionLabelAt(5)">{{sessionLabelAt(5)}}</p>
    </section>
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
        if (this.sessions.length <= AgentConsoleSessionsPanelComponent.VISIBLE_SESSIONS) {
            return 0;
        }
        const selectedIndex = Math.max(0, this.sessions.findIndex(item => item.id === this.state.selectedSessionId));
        const windowSize = AgentConsoleSessionsPanelComponent.VISIBLE_SESSIONS;
        const centeredStart = selectedIndex - Math.floor(windowSize / 2);
        return Math.max(0, Math.min(this.sessions.length - windowSize, centeredStart));
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
    template: `
    <section class="console-panel console-tools-panel" v-style="shellStyle">
        <p v-style="accentStyle">{{toolsSummaryLabel}}</p>
    </section>
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
    template: `
    <section class="console-panel console-tool-runs-panel" v-style="shellStyle">
        <p class="tool-run-item" v-style="accentStyle">{{toolRunsSummaryLabel}}</p>
    </section>
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
    template: `
    <section class="console-panel console-messages-panel" v-style="shellStyle">
        <p class="message-empty" v-style="emptyStyle" v-show="emptyLabel">{{emptyLabel}}</p>
        <p class="message-hint" v-style="titleStyle" v-show="messagesHintLabel">{{messagesHintLabel}}</p>
        <p class="message-item" v-style="messageItemStyleAt(0)" v-show="hasMessageAt(0)"><span v-style="messageRoleStyleAt(0)">{{messageRoleAt(0)}}</span><span v-style="messageContentStyleAt(0)">{{messageContentAt(0)}}</span></p>
        <p class="message-item" v-style="messageItemStyleAt(1)" v-show="hasMessageAt(1)"><span v-style="messageRoleStyleAt(1)">{{messageRoleAt(1)}}</span><span v-style="messageContentStyleAt(1)">{{messageContentAt(1)}}</span></p>
        <p class="message-item" v-style="messageItemStyleAt(2)" v-show="hasMessageAt(2)"><span v-style="messageRoleStyleAt(2)">{{messageRoleAt(2)}}</span><span v-style="messageContentStyleAt(2)">{{messageContentAt(2)}}</span></p>
        <p class="message-item" v-style="messageItemStyleAt(3)" v-show="hasMessageAt(3)"><span v-style="messageRoleStyleAt(3)">{{messageRoleAt(3)}}</span><span v-style="messageContentStyleAt(3)">{{messageContentAt(3)}}</span></p>
        <p class="message-item" v-style="messageItemStyleAt(4)" v-show="hasMessageAt(4)"><span v-style="messageRoleStyleAt(4)">{{messageRoleAt(4)}}</span><span v-style="messageContentStyleAt(4)">{{messageContentAt(4)}}</span></p>
        <p class="message-item" v-style="messageItemStyleAt(5)" v-show="hasMessageAt(5)"><span v-style="messageRoleStyleAt(5)">{{messageRoleAt(5)}}</span><span v-style="messageContentStyleAt(5)">{{messageContentAt(5)}}</span></p>
        <p class="message-item" v-style="messageItemStyleAt(6)" v-show="hasMessageAt(6)"><span v-style="messageRoleStyleAt(6)">{{messageRoleAt(6)}}</span><span v-style="messageContentStyleAt(6)">{{messageContentAt(6)}}</span></p>
    </section>
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
        if (messages.length <= 7) {
            return messages;
        }
        const selectedIndex = Math.max(0, messages.findIndex(message => message.id === this.state.selectedMessageId));
        const start = Math.max(0, Math.min(messages.length - 7, selectedIndex - 3));
        return messages.slice(start, start + 7);
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
                    : '';
            const itemStyle = rowStyleText ? styleTextToObject(rowStyleText) : {};
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
    template: `
    <section class="console-panel console-message-detail-panel" v-style="shellStyle">
        <p v-style="accentStyle">{{detailSummaryLabel}}</p>
        <p v-style="hintStyle">{{detailHintLabel}}</p>
        <p><span v-style="lineNumberStyle">{{detailLineNumberAt(0)}}</span><span v-style="lineStyle">{{detailLineContentAt(0)}}</span></p>
        <p><span v-style="lineNumberStyle">{{detailLineNumberAt(1)}}</span><span v-style="lineStyle">{{detailLineContentAt(1)}}</span></p>
        <p><span v-style="lineNumberStyle">{{detailLineNumberAt(2)}}</span><span v-style="lineStyle">{{detailLineContentAt(2)}}</span></p>
        <p><span v-style="lineNumberStyle">{{detailLineNumberAt(3)}}</span><span v-style="lineStyle">{{detailLineContentAt(3)}}</span></p>
        <p><span v-style="lineNumberStyle">{{detailLineNumberAt(4)}}</span><span v-style="lineStyle">{{detailLineContentAt(4)}}</span></p>
        <p><span v-style="lineNumberStyle">{{detailLineNumberAt(5)}}</span><span v-style="lineStyle">{{detailLineContentAt(5)}}</span></p>
    </section>
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
    template: `
    <section class="console-panel console-activity-panel" v-style="shellStyle">
        <p class="activity-item"><span v-style="activityKindStyleAt(0)">{{activityKindAt(0)}}</span><span v-style="activityMessageStyleAt(0)">{{activityMessageAt(0)}}</span></p>
        <p class="activity-item"><span v-style="activityKindStyleAt(1)">{{activityKindAt(1)}}</span><span v-style="activityMessageStyleAt(1)">{{activityMessageAt(1)}}</span></p>
        <p class="activity-item"><span v-style="activityKindStyleAt(2)">{{activityKindAt(2)}}</span><span v-style="activityMessageStyleAt(2)">{{activityMessageAt(2)}}</span></p>
    </section>
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
    template: `
    <section class="console-panel console-select-panel">
        <div class="select-shell" v-style="shellStyle">
            <p class="select-title" v-style="headerStyle">{{menuTitle}}</p>
            <p class="select-caption" v-style="detailLabelStyle">{{menuMeta}}</p>
            <p class="select-option" v-style="optionStyleAt(0)" @click="selectOptionAt(0)">{{optionLabelAt(0)}}</p>
            <p class="select-option" v-style="optionStyleAt(1)" @click="selectOptionAt(1)">{{optionLabelAt(1)}}</p>
            <p class="select-option" v-style="optionStyleAt(2)" @click="selectOptionAt(2)">{{optionLabelAt(2)}}</p>
            <p class="select-option" v-style="optionStyleAt(3)" @click="selectOptionAt(3)">{{optionLabelAt(3)}}</p>
            <p class="select-option" v-style="optionStyleAt(4)" @click="selectOptionAt(4)">{{optionLabelAt(4)}}</p>
            <p class="select-option" v-style="optionStyleAt(5)" @click="selectOptionAt(5)">{{optionLabelAt(5)}}</p>
            <p class="select-option" v-style="optionStyleAt(6)" @click="selectOptionAt(6)">{{optionLabelAt(6)}}</p>
            <p class="select-option" v-style="optionStyleAt(7)" @click="selectOptionAt(7)">{{optionLabelAt(7)}}</p>
            <p class="select-option" v-style="optionStyleAt(8)" @click="selectOptionAt(8)">{{optionLabelAt(8)}}</p>
            <p class="select-option" v-style="optionStyleAt(9)" @click="selectOptionAt(9)">{{optionLabelAt(9)}}</p>
            <p class="select-option" v-style="optionStyleAt(10)" @click="selectOptionAt(10)">{{optionLabelAt(10)}}</p>
            <p class="select-option" v-style="optionStyleAt(11)" @click="selectOptionAt(11)">{{optionLabelAt(11)}}</p>
            <p class="select-detail-label" v-style="detailLabelStyle">{{detailTitle}}</p>
            <p class="select-detail-line" v-style="detailValueStyle">{{detailLineAt(0)}}</p>
            <p class="select-detail-line" v-style="detailValueStyle">{{detailLineAt(1)}}</p>
            <p class="select-detail-line" v-style="detailValueStyle">{{detailLineAt(2)}}</p>
            <p class="select-detail-line" v-style="detailValueStyle">{{detailLineAt(3)}}</p>
            <p class="select-detail-line" v-style="detailValueStyle">{{detailLineAt(4)}}</p>
            <p class="select-detail-line" v-style="detailValueStyle">{{detailLineAt(5)}}</p>
            <p class="select-hint" v-style="hintStyle">{{menuHint}}</p>
        </div>
    </section>
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

    get visibleOptionStart(): number {
        if (!this.menu || this.menu.options.length <= AgentConsoleSelectPanelComponent.VISIBLE_OPTIONS) {
            return 0;
        }
        const windowSize = AgentConsoleSelectPanelComponent.VISIBLE_OPTIONS;
        const centeredStart = this.menu.selectedIndex - Math.floor(windowSize / 2);
        return Math.max(0, Math.min(this.menu.options.length - windowSize, centeredStart));
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
            const marker = this.menu && this.menu.selectedIndex === absoluteIndex ? '›' : ' ';
            return {
            label: `${marker} ${absoluteIndex + 1}. ${option.label}`,
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
        const option = this.selectedOption;
        if (!option) {
            return [];
        }
        const detail = option.detail ?? option.description ?? option.label;
        if (typeof detail === 'string') {
            return detail
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .slice(0, 3);
        }
        return JSON.stringify(detail, null, 2)
            .split('\n')
            .slice(0, 6);
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
