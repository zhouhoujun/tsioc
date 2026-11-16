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
            <button class="workflow-btn" @click="close">{{closeLabel}}</button>
        </div>
        <div class="workflow-debug-search-row" v-if="mode === 'messages'">
            <input class="workflow-debug-search" type="search"
                placeholder="{{searchPlaceholder}}" [value]="search" @input="searchInput" />
        </div>
        <div class="workflow-run-log-body" v-if="mode === 'logs'">
            <div class="workflow-run-log-row" v-for="item in items" [class]="rowClass(item)">
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

    mode: 'logs' | 'messages' = 'logs';
    search = '';
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

    get closeLabel(): string {
        return this.t('close', 'Close');
    }

    get filteredDebugItems(): WorkflowDebugItem[] {
        const query = String(this.search || '').trim().toLowerCase();
        if (!query) {
            return this.debugItems;
        }
        return this.debugItems.filter(item =>
            [item.name, item.typeLabel, item.resultText, item.errorText]
                .some(value => String(value || '').toLowerCase().includes(query))
        );
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
