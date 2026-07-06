import { Component } from '@tsdi/components';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';

@Component({
    selector: 'agent-console-status-panel',
    template: `
    <section class="console-panel console-status-panel">
        <h2>Status</h2>
        <p class="status">Status: {{status}}</p>
        <p class="model">Model: {{provider}} / {{model}}</p>
        <p class="workspace">Workspace: {{workspace}}</p>
        <p class="running-tools">Running tools: {{runningToolsLabel}}</p>
        <p class="last-error">Last error: {{lastErrorLabel}}</p>
        <p class="tasks">Tasks: {{tasksCount}}</p>
        <p class="notice" v-if="notice">{{notice}}</p>
    </section>
    `
})
export class AgentConsoleStatusPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
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

    get runningToolsLabel(): string {
        return this.state.runningTools.length ? this.state.runningTools.join(', ') : 'none';
    }

    get lastErrorLabel(): string {
        return this.state.lastError || 'none';
    }

    get notice(): string {
        return this.state.notice;
    }

    get tasksCount(): number {
        return this.state.tasksCount;
    }
}

@Component({
    selector: 'agent-console-input-panel',
    template: `
    <section class="console-panel console-input-panel">
        <h2>Input</h2>
        <input class="agent-input" v-model="input" />
        <button class="send-btn" @click="submit">Send</button>
    </section>
    `
})
export class AgentConsoleInputPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
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
}

@Component({
    selector: 'agent-console-tools-panel',
    template: `
    <section class="console-panel console-tools-panel">
        <h2>Tools</h2>
        <p>Tools: {{tools.length}}</p>
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
        <h2>Tool Runs</h2>
        <p class="tool-run-item" v-for="item in toolRunLabels">{{item}}</p>
        <div class="tool-run-detail" v-if="highlightedToolRun">
            <p class="tool-run-detail-name">Focused: {{highlightedToolRunName}}</p>
            <p class="tool-run-detail-status">State: {{highlightedToolRunStatus}}</p>
            <p class="tool-run-detail-input">Input: {{highlightedToolRunInput}}</p>
            <p class="tool-run-detail-output">Output: {{highlightedToolRunOutput}}</p>
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
        <h2>Messages</h2>
        <p class="message-item" v-for="item in messageLabels">{{item}}</p>
    </section>
    `
})
export class AgentConsoleMessagesPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
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
        <h2>Activity</h2>
        <p class="activity-item" v-for="item in activityLabels">{{item}}</p>
    </section>
    `
})
export class AgentConsoleActivityPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
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
        <h2>{{menuTitle}}</h2>
        <button class="select-option" v-for="item in menuOptionItems" @click="selectOption(item.value)">{{item.label}}</button>
        <p class="select-hint">{{menuHint}}</p>
    </section>
    `
})
export class AgentConsoleSelectPanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    get menu() {
        return this.state.selectMenu;
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
            const marker = this.menu && this.menu.selectedIndex === index ? '›' : ' ';
            return `${marker} ${index + 1}. ${option.label}${description}`;
        });
    }

    get menuOptionItems(): Array<{ label: string; value: string }> {
        if (!this.menu) {
            return [];
        }
        return this.menu.options.map((option, index) => ({
            label: this.menuOptionLabels[index] || '',
            value: option.value
        }));
    }

    async selectOption(value: string): Promise<void> {
        await this.state.confirmSelectMenu(value);
    }
}
