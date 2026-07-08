import { Attribute, Component, OnDestroy, AfterViewInit } from '@tsdi/components';
import {
    AgentConsoleActivity,
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
        <p class="status-line" v-style="statusStyle">{{statusSummary}}</p>
        <p class="model-line" v-style="valueStyle">{{workspaceSummary}}</p>
        <p class="notice" v-style="noticeStyle">{{noticeLine}}</p>
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
        return this.notice ? `Notice: ${this.notice}` : '';
    }

    get statusSummary(): string {
        return [
            `status ${this.status}`,
            `${this.provider || 'provider'} / ${this.model || 'model'}`,
            `running ${this.runningToolsLabel}`,
            `error ${this.lastErrorLabel}`
        ].join('  |  ');
    }

    get workspaceSummary(): string {
        return this.workspace ? `workspace ${this.workspace}` : 'workspace -';
    }

    get shellStyle() {
        return styleTextToObject(this.activeTheme.statusShell);
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
        switch (status) {
            case 'error':
                return this.activeTheme.statusErrorValue;
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
            <p class="input-hint" v-style="hintStyle">{{hintLabel}}</p>
        </div>
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
        return this.input ? '' : 'Ask for code, files, commands, or reviews';
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
        return 'enter submit   tab complete   /quit exit';
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
        <p class="working-line" v-style="lineStyle">{{workingSummary}}</p>
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
        return true;
    }

    get workingSummary(): string {
        return [
            `tokens ${this.totalTokens}`,
            `prompt ${this.promptTokens}`,
            `completion ${this.completionTokens}`,
            `messages ${this.messagesCount}`,
            `tasks ${this.tasksCount}`
        ].join('  |  ');
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
        return this.tools.length ? styleTextToObject(this.activeTheme.toolsShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.toolsTitle);
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get toolLabels(): string[] {
        return this.tools.slice(0, 4).map(tool => `${tool.name}${tool.active ? '' : ' [inactive]'}${tool.toolset ? ` (${tool.toolset})` : ''}`);
    }

    get toolsSummary(): string {
        return this.toolLabels.join(' | ');
    }

    get toolsSummaryLabel(): string {
        return this.tools.length
            ? `tools ${this.tools.length}  |  ${this.toolsSummary}`
            : '';
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
        if (!this.highlightedToolRun) {
            return '';
        }
        const detail = this.highlightedToolRun.inputSummary || this.highlightedToolRun.outputSummary || this.highlightedToolRun.error || this.highlightedToolRun.message;
        return `tool ${this.highlightedToolRun.name}  |  ${this.highlightedToolRun.status}  |  ${this.summarize(detail || '-')}`;
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
        <p class="message-item"><span v-style="messageRoleStyleAt(0)">{{messageRoleAt(0)}}</span><span v-style="messageContentStyleAt(0)">{{messageContentAt(0)}}</span></p>
        <p class="message-item"><span v-style="messageRoleStyleAt(1)">{{messageRoleAt(1)}}</span><span v-style="messageContentStyleAt(1)">{{messageContentAt(1)}}</span></p>
        <p class="message-item"><span v-style="messageRoleStyleAt(2)">{{messageRoleAt(2)}}</span><span v-style="messageContentStyleAt(2)">{{messageContentAt(2)}}</span></p>
        <p class="message-item"><span v-style="messageRoleStyleAt(3)">{{messageRoleAt(3)}}</span><span v-style="messageContentStyleAt(3)">{{messageContentAt(3)}}</span></p>
        <p class="message-item"><span v-style="messageRoleStyleAt(4)">{{messageRoleAt(4)}}</span><span v-style="messageContentStyleAt(4)">{{messageContentAt(4)}}</span></p>
        <p class="message-item"><span v-style="messageRoleStyleAt(5)">{{messageRoleAt(5)}}</span><span v-style="messageContentStyleAt(5)">{{messageContentAt(5)}}</span></p>
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

    get messages(): Array<{ role?: string; content: string }> {
        return this.state.messages;
    }

    get shellStyle() {
        return this.messageItems.length ? styleTextToObject(this.activeTheme.messagesShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.messagesTitle);
    }

    get messageItems(): Array<{ role: string; content: string; roleStyle: Record<string, string>; contentStyle: Record<string, string> }> {
        return this.messages.slice(-6).map(message => {
            const role = this.getMessageRoleLabel(message.role);
            return {
                role: `${role}> `,
                content: this.summarize(message.content),
                roleStyle: styleTextToObject(this.resolveMessageRoleStyle(role)),
                contentStyle: styleTextToObject(this.activeTheme.statusValue)
            };
        });
    }

    get messageLabels(): string[] {
        return this.messageItems.map(item => `${item.role}${item.content}`);
    }

    get messagesSummary(): string {
        return this.messageLabels.join(' | ');
    }

    messageAt(index: number): { role: string; content: string; roleStyle: Record<string, string>; contentStyle: Record<string, string> } | undefined {
        return this.messageItems[index];
    }

    messageRoleAt(index: number): string {
        return this.messageAt(index)?.role || '';
    }

    messageContentAt(index: number): string {
        return this.messageAt(index)?.content || '';
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

    protected resolveMessageRoleStyle(role: string): string {
        switch (role) {
            case 'you':
                return this.activeTheme.inputPrompt;
            case 'agent':
                return this.activeTheme.toolsAccent;
            default:
                return this.activeTheme.statusLabel;
        }
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
        return this.activityItems.length ? styleTextToObject(this.activeTheme.activityShell) : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.activityTitle);
    }

    get activityItems(): Array<{ kind: string; message: string; kindStyle: Record<string, string>; messageStyle: Record<string, string> }> {
        return this.activities.slice(-3).map(activity => ({
            kind: `${activity.kind}: `,
            message: this.summarize(activity.message),
            kindStyle: styleTextToObject(this.activeTheme.toolsAccent),
            messageStyle: styleTextToObject(this.activeTheme.statusValue)
        }));
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
            ? (this.menu.hint ? this.menu.hint : '1-9 choose   up/down move   enter confirm   esc close')
            : '';
    }

    get menuMeta(): string {
        if (!this.menu || !this.menu.options.length) {
            return '';
        }
        return `Choose ${this.menu.selectedIndex + 1} of ${this.menu.options.length}`;
    }

    get menuOptionLabels(): string[] {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.map((option, index) => {
            const marker = this.menu && this.menu.selectedIndex === index ? '›' : ' ';
            return `${marker} ${index + 1}. ${option.label}`;
        });
    }

    get menuOptionItems(): Array<{ label: string; value: string; style: Record<string, string> }> {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.map((option, index) => ({
            label: this.menuOptionLabels[index] || '',
            value: option.value,
            style: styleTextToObject(this.menu && this.menu.selectedIndex === index ? this.activeTheme.selectOptionActive : this.activeTheme.selectOption)
        }));
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
