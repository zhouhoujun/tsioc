import { Component } from '@tsdi/components';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { styleTextToObject } from './AgentConsoleTheme';

@Component({
    selector: 'agent-console-status-panel',
    template: `
    <section class="console-panel console-status-panel">
        <h2 v-style="titleStyle">Status</h2>
        <p class="status-line" v-style="statusStyle">State: {{status}}</p>
        <p class="model-line" v-style="valueStyle">Model: {{provider}} / {{model}}</p>
        <p class="workspace-line" v-style="valueStyle">Workspace: {{workspace}}</p>
        <p class="running-tools-line" v-style="runningStyle">Running: {{runningToolsLabel}}</p>
        <p class="last-error-line" v-style="errorStyle">Error: {{lastErrorLabel}}</p>
        <p class="notice" v-if="notice" v-style="noticeStyle">Notice: {{notice}}</p>
    </section>
    `
})
export class AgentConsoleStatusPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get theme() {
        return this.state.theme;
    }

    get titleStyle() {
        return styleTextToObject(this.theme.statusTitle);
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

    get valueStyle() {
        return styleTextToObject(this.theme.statusValue);
    }

    get runningToolsLabel(): string {
        return this.state.runningTools.length ? this.state.runningTools.join(', ') : 'none';
    }

    get lastErrorLabel(): string {
        return this.state.lastError || 'none';
    }

    get notice(): string {
        return this.state.notice;
    }

    get statusStyle() {
        return styleTextToObject(this.resolveToneStyle(this.status));
    }

    get runningStyle() {
        return styleTextToObject(this.state.runningTools.length ? this.theme.statusBusyValue : this.theme.statusIdleValue);
    }

    get errorStyle() {
        return styleTextToObject(this.state.lastError ? this.theme.statusErrorValue : this.theme.statusLabel);
    }

    get noticeStyle() {
        return styleTextToObject(this.theme.statusNoticeValue);
    }

    protected resolveToneStyle(status: string): string {
        switch (status) {
            case 'error':
                return this.theme.statusErrorValue;
            case 'running':
            case 'reasoning':
                return this.theme.statusBusyValue;
            default:
                return this.theme.statusIdleValue;
        }
    }
}

@Component({
    selector: 'agent-console-input-panel',
    template: `
    <section class="console-panel console-input-panel">
        <h2 v-style="titleStyle">Input</h2>
        <div class="input-shell" v-style="shellStyle">
            <p class="input-caption" v-style="captionStyle">Ask the agent</p>
            <input class="agent-input" v-style="fieldStyle" v-model="input" @keyup="onKeyup($event)" />
            <button class="send-btn" v-style="buttonStyle" @click="submit">Send</button>
            <p class="input-hint" v-style="hintStyle">Enter send</p>
        </div>
    </section>
    `
})
export class AgentConsoleInputPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get theme() {
        return this.state.theme;
    }

    get titleStyle() {
        return styleTextToObject(this.theme.inputTitle);
    }

    get shellStyle() {
        return styleTextToObject(this.theme.inputShell);
    }

    get captionStyle() {
        return styleTextToObject(this.theme.inputCaption);
    }

    get fieldStyle() {
        return styleTextToObject(this.theme.inputField);
    }

    get buttonStyle() {
        return styleTextToObject(this.theme.inputButton);
    }

    get hintStyle() {
        return styleTextToObject(this.theme.inputHint);
    }

    get input(): string {
        return this.state.input;
    }

    set input(value: string) {
        this.state.setInput(value);
    }

    async submit(): Promise<void> {
        await this.state.submitAction?.();
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
    <section class="console-panel console-working-panel">
        <h2 v-style="titleStyle">Working</h2>
        <p class="working-line" v-style="lineStyle">Tokens: {{totalTokens}} | Prompt: {{promptTokens}} | Completion: {{completionTokens}}</p>
        <p class="working-line" v-style="lineStyle">Messages: {{messagesCount}} | Tools: {{toolsCount}} | Runs: {{toolRunsCount}}</p>
        <p class="working-line" v-style="lineStyle">Activity: {{activitiesCount}} | Tasks: {{tasksCount}}</p>
    </section>
    `
})
export class AgentConsoleWorkingPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get theme() {
        return this.state.theme;
    }

    get titleStyle() {
        return styleTextToObject(this.theme.workingTitle);
    }

    get lineStyle() {
        return styleTextToObject(this.theme.workingValue);
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
}

@Component({
    selector: 'agent-console-tools-panel',
    template: `
    <section class="console-panel console-tools-panel">
        <h2 v-style="titleStyle">Tools</h2>
        <p v-style="accentStyle">Tools: {{tools.length}}</p>
        <p class="tool-item" v-for="item in toolLabels">{{item}}</p>
    </section>
    `
})
export class AgentConsoleToolsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get tools() {
        return this.state.tools;
    }

    get titleStyle() {
        return styleTextToObject(this.state.theme.toolsTitle);
    }

    get accentStyle() {
        return styleTextToObject(this.state.theme.toolsAccent);
    }

    get toolLabels(): string[] {
        return this.tools.slice(0, 4).map(tool => `${tool.name}${tool.active ? '' : ' [inactive]'}${tool.toolset ? ` (${tool.toolset})` : ''}`);
    }

    get toolsSummary(): string {
        return this.toolLabels.join(' | ');
    }
}

@Component({
    selector: 'agent-console-tool-runs-panel',
    template: `
    <section class="console-panel console-tool-runs-panel">
        <h2 v-style="titleStyle">Tool Runs</h2>
        <p class="tool-run-item" v-for="item in toolRunLabels">{{item}}</p>
        <div class="tool-run-detail" v-if="highlightedToolRun">
            <p class="tool-run-detail-name" v-style="accentStyle">Focused: {{highlightedToolRunName}}</p>
            <p class="tool-run-detail-status" v-style="accentStyle">State: {{highlightedToolRunStatus}}</p>
            <p class="tool-run-detail-input" v-style="accentStyle">Input: {{highlightedToolRunInput}}</p>
            <p class="tool-run-detail-output" v-style="accentStyle">Output: {{highlightedToolRunOutput}}</p>
        </div>
    </section>
    `
})
export class AgentConsoleToolRunsPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get toolRuns() {
        return this.state.toolRuns;
    }

    get titleStyle() {
        return styleTextToObject(this.state.theme.toolRunsTitle);
    }

    get accentStyle() {
        return styleTextToObject(this.state.theme.toolRunsAccent);
    }

    get highlightedToolRun() {
        return this.state.highlightedToolRun;
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
}

@Component({
    selector: 'agent-console-messages-panel',
    template: `
    <section class="console-panel console-messages-panel">
        <h2 v-style="titleStyle">Messages</h2>
        <p class="message-item" v-for="item in messageLabels">{{item}}</p>
    </section>
    `
})
export class AgentConsoleMessagesPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get titleStyle() {
        return styleTextToObject(this.state.theme.messagesTitle);
    }

    get messages() {
        return this.state.messages;
    }

    get messageLabels(): string[] {
        return this.messages.slice(-6).map(message => `${this.getMessageRoleLabel(message.role)}> ${this.state.summarize(message.content)}`);
    }

    get messagesSummary(): string {
        return this.messageLabels.join(' | ');
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
}

@Component({
    selector: 'agent-console-activity-panel',
    template: `
    <section class="console-panel console-activity-panel">
        <h2 v-style="titleStyle">Activity</h2>
        <p class="activity-item" v-for="item in activityLabels">{{item}}</p>
    </section>
    `
})
export class AgentConsoleActivityPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get titleStyle() {
        return styleTextToObject(this.state.theme.activityTitle);
    }

    get activities() {
        return this.state.activities;
    }

    get activityLabels(): string[] {
        return this.activities.slice(-3).map(activity => `${activity.kind}: ${this.state.summarize(activity.message)}`);
    }

    get activitiesSummary(): string {
        return this.activityLabels.join(' | ');
    }
}

@Component({
    selector: 'agent-console-select-panel',
    template: `
    <section class="console-panel console-select-panel" v-if="menu">
        <h2 v-style="titleStyle">Select</h2>
        <div class="select-shell" v-style="shellStyle">
            <p class="select-title" v-style="headerStyle">{{menuTitle}}</p>
            <button class="select-option" v-style="item.style" v-for="item in menuOptionItems" @click="selectOption(item.value)">{{item.label}}</button>
            <p class="select-hint" v-style="hintStyle">{{menuHint}}</p>
        </div>
    </section>
    `
})
export class AgentConsoleSelectPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get menu() {
        return this.state.selectMenu;
    }

    get titleStyle() {
        return styleTextToObject(this.state.theme.selectTitle);
    }

    get shellStyle() {
        return styleTextToObject(this.state.theme.selectShell);
    }

    get headerStyle() {
        return styleTextToObject(this.state.theme.selectHeader);
    }

    get hintStyle() {
        return styleTextToObject(this.state.theme.selectHint);
    }

    get menuTitle(): string {
        return this.menu ? this.menu.title : '';
    }

    get menuHint(): string {
        return this.menu && this.menu.hint ? this.menu.hint : '1-9 select   up/down move   enter confirm   q cancel';
    }

    get menuOptionLabels(): string[] {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.map((option, index) => {
            const description = option.description ? ` ${option.description}` : '';
            const marker = this.menu && this.menu.selectedIndex === index ? '>' : ' ';
            return `${marker} ${index + 1}. ${option.label}${description}`;
        });
    }

    get menuOptionItems(): Array<{ label: string; value: string; style: Record<string, string> }> {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.map((option, index) => ({
            label: this.menuOptionLabels[index] || '',
            value: option.value,
            style: styleTextToObject(this.menu && this.menu.selectedIndex === index ? this.state.theme.selectOptionActive : this.state.theme.selectOption)
        }));
    }

    async selectOption(value: string): Promise<void> {
        await this.state.confirmSelectMenu(value);
    }
}
