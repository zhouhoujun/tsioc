import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowDebugItem, WorkflowExecutionLogEntry } from '../types';

/**
 * Execution inspector panel. Shows either the retained log entries or the
 * structured per-node outputs of the selected run, with a filter for large
 * payloads.
 */
@Component({
    selector: 'workflow-run-log',
    template: `
    <div class="workflow-run-log" v-show="visible && (items.length || debugItems.length)">
        <div class="workflow-run-log-head">
            <span class="workflow-run-log-title">{{title}}</span>
            <button type="button" class="workflow-run-log-tab" data-mode="logs"
                [class]="tabClass('logs')" @click="setMode('logs')">{{logsLabel}}</button>
            <button type="button" class="workflow-run-log-tab" data-mode="messages"
                [class]="tabClass('messages')" @click="setMode('messages')">{{messagesLabel}}</button>
            <span class="workflow-status-spacer"></span>
            <button class="workflow-btn workflow-debug-clear" type="button"
                v-if="mode === 'messages'" @click="clearState">{{clearStateLabel}}</button>
            <button class="workflow-btn" @click="close">{{closeLabel}}</button>
        </div>
        <div class="workflow-debug-search-row">
            <select class="workflow-debug-filter" v-if="mode === 'messages'"
                data-filter="node" aria-label="{{nodeFilterLabel}}"
                [value]="nodeFilter" @change="nodeFilterInput">
                <option value="">{{allNodesLabel}}</option>
                <option v-for="option in nodeOptions" [value]="option.id">{{option.name}}</option>
            </select>
            <select class="workflow-debug-filter" v-else
                data-filter="level" aria-label="{{levelFilterLabel}}"
                [value]="levelFilter" @change="levelFilterInput">
                <option value="">{{allLevelsLabel}}</option>
                <option v-for="option in levelOptions" [value]="option.value">{{option.label}}</option>
            </select>
            <input class="workflow-debug-search" type="search"
                placeholder="{{searchPlaceholder}}" [value]="search" @input="searchInput" />
        </div>
        <div class="workflow-run-log-body" v-if="mode === 'logs'">
            <div class="workflow-debug-empty" v-if="!filteredLogItems.length">{{noLogsLabel}}</div>
            <div class="workflow-run-log-row" v-for="item in filteredLogItems" data-level="{{item.level}}" [class]="rowClass(item)">
                <span class="workflow-run-log-time">{{formatTime(item.timestamp)}}</span>
                <span class="workflow-run-log-level">{{levelLabel(item.level)}}</span>
                <span class="workflow-run-log-message">{{item.message}}</span>
            </div>
        </div>
        <div class="workflow-run-log-body" v-else>
            <div class="workflow-debug-empty" v-if="!filteredDebugItems.length">{{noMessagesLabel}}</div>
            <div class="workflow-debug-item" v-for="item in filteredDebugItems"
                data-node-id="{{item.nodeId}}">
                <button type="button" class="workflow-debug-summary" @click="toggleItem(item.nodeId)">
                    <span class="workflow-debug-name">{{item.name}}</span>
                    <span class="workflow-debug-type">{{item.typeLabel}}</span>
                    <span class="workflow-debug-status" [class]="debugStatusClass(item)">{{item.statusLabel}}</span>
                    <span class="workflow-debug-duration" v-if="item.durationLabel">{{item.durationLabel}}</span>
                </button>
                <pre class="workflow-debug-payload" v-if="isExpanded(item.nodeId)">{{item.resultText}}</pre>
                <div class="workflow-debug-error" v-if="isExpanded(item.nodeId) && item.errorText">{{item.errorText}}</div>
                <div class="workflow-debug-state" v-if="isExpanded(item.nodeId) && item.stateText">
                    <div class="workflow-debug-state-title">{{runtimeStateLabel}}</div>
                    <pre class="workflow-debug-payload">{{item.stateText}}</pre>
                </div>
            </div>
        </div>
    </div>`
})
export class WorkflowRunLogComponent {
    @Attribute() items: WorkflowExecutionLogEntry[] = [];
    @Attribute() debugItems: WorkflowDebugItem[] = [];
    @Attribute() visible = false;
    @Attribute() locale = 'zh-CN';
    @Attribute() closeAction?: () => void;
    @Attribute() clearStateAction?: () => void;

    mode: 'logs' | 'messages' = 'logs';
    search = '';
    nodeFilter = '';
    levelFilter = '';
    expanded: Record<string, boolean> = {};

    constructor(@Optional() private translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            `workflow.ui.${key}`,
            fallback
        );
    }

    get title(): string {
        return this.t('logTitle', 'Execution log');
    }

    get logsLabel(): string {
        return this.t('logs', 'Logs');
    }

    get messagesLabel(): string {
        return this.t('messages', 'Messages');
    }

    get searchPlaceholder(): string {
        return this.t('debugSearch', 'Filter messages');
    }

    get noMessagesLabel(): string {
        return this.t('noMessages', 'No node outputs for this run.');
    }

    get runtimeStateLabel(): string {
        return this.t('runtimeState', 'Runtime state');
    }

    get closeLabel(): string {
        return this.t('close', 'Close');
    }

    get clearStateLabel(): string {
        return this.t('clearRuntimeState', 'Clear state');
    }

    clearState(): void {
        this.clearStateAction?.();
    }

    get allNodesLabel(): string {
        return this.t('allNodes', 'All nodes');
    }

    get allLevelsLabel(): string {
        return this.t('allLevels', 'All levels');
    }

    get nodeFilterLabel(): string {
        return this.t('filterNode', 'Filter by node');
    }

    get levelFilterLabel(): string {
        return this.t('filterLevel', 'Filter by level');
    }

    get noLogsLabel(): string {
        return this.t('noLogs', 'No log entries match the filters.');
    }

    get nodeOptions(): Array<{ id: string; name: string }> {
        const seen = new Set<string>();
        return (this.debugItems || [])
            .filter(item => item?.nodeId && !seen.has(item.nodeId) && (seen.add(item.nodeId), true))
            .map(item => ({ id: item.nodeId, name: item.name || item.nodeId }))
            .sort((left, right) => left.name.localeCompare(right.name));
    }

    get levelOptions(): Array<{ value: string; label: string }> {
        const levels = ['info', 'success', 'warning', 'error'];
        return levels.map(level => ({ value: level, label: this.levelLabel(level as any) }));
    }

    get filteredLogItems(): WorkflowExecutionLogEntry[] {
        const query = String(this.search || '').trim().toLowerCase();
        return (this.items || []).filter(item => {
            if (this.levelFilter && item.level !== this.levelFilter) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [item.message, item.level, this.levelLabel(item.level)]
                .some(value => String(value || '').toLowerCase().includes(query));
        });
    }

    get filteredDebugItems(): WorkflowDebugItem[] {
        const query = String(this.search || '').trim().toLowerCase();
        return (this.debugItems || []).filter(item => {
            if (this.nodeFilter && item.nodeId !== this.nodeFilter) {
                return false;
            }
            if (!query) {
                return true;
            }
            return [item.name, item.typeLabel, item.resultText, item.errorText]
                .some(value => String(value || '').toLowerCase().includes(query));
        });
    }

    levelLabel(level: WorkflowExecutionLogEntry['level']): string {
        const fallback: Record<string, string> = {
            info: 'INFO',
            success: 'OK',
            warning: 'WARN',
            error: 'ERROR'
        };
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            `workflow.log.${level}`,
            fallback[level] || level
        );
    }

    formatTime(timestamp: number): string {
        const date = new Date(timestamp);
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    rowClass(item: WorkflowExecutionLogEntry): Record<string, boolean> {
        return {
            'workflow-run-log-row': true,
            [`workflow-run-log-${item.level}`]: true
        };
    }

    tabClass(mode: string): Record<string, boolean> {
        return {
            'workflow-run-log-tab': true,
            'is-active': this.mode === mode
        };
    }

    debugStatusClass(item: WorkflowDebugItem): Record<string, boolean> {
        return {
            'workflow-debug-status': true,
            [`is-${item.status}`]: true
        };
    }

    setMode(mode: string): void {
        this.mode = mode === 'messages' ? 'messages' : 'logs';
    }

    searchInput(event: any): void {
        this.search = String(event?.target?.value ?? '');
    }

    nodeFilterInput(event: any): void {
        this.nodeFilter = String(event?.target?.value ?? '');
    }

    levelFilterInput(event: any): void {
        this.levelFilter = String(event?.target?.value ?? '');
    }

    toggleItem(nodeId: string): void {
        this.expanded = {
            ...this.expanded,
            [nodeId]: !this.expanded[nodeId]
        };
    }

    isExpanded(nodeId: string): boolean {
        return this.expanded[nodeId] === true;
    }

    close(): void {
        this.closeAction?.();
    }
}
