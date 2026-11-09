import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowExecutionLogEntry } from '../types';

/**
 * Execution-log panel. Renders the retained log entries of the currently
 * selected run (latest or replayed from history).
 */
@Component({
    selector: 'workflow-run-log',
    template: `
    <div class="workflow-run-log" v-show="visible && items.length">
        <div class="workflow-run-log-head">
            <span class="workflow-run-log-title">{{title}}</span>
            <span class="workflow-status-spacer"></span>
            <button class="workflow-btn" @click="close">{{closeLabel}}</button>
        </div>
        <div class="workflow-run-log-body">
            <div class="workflow-run-log-row" v-for="item in items" [class]="rowClass(item)">
                <span class="workflow-run-log-time">{{formatTime(item.timestamp)}}</span>
                <span class="workflow-run-log-level">{{levelLabel(item.level)}}</span>
                <span class="workflow-run-log-message">{{item.message}}</span>
            </div>
        </div>
    </div>`
})
export class WorkflowRunLogComponent {
    @Attribute() items: WorkflowExecutionLogEntry[] = [];
    @Attribute() visible = false;
    @Attribute() locale = 'zh-CN';
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    get title(): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.logTitle',
            this.isZh ? '执行日志' : 'Execution log'
        );
    }

    get closeLabel(): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.close',
            this.isZh ? '关闭' : 'Close'
        );
    }

    levelLabel(level: WorkflowExecutionLogEntry['level']): string {
        const fallback: Record<string, string> = {
            info: this.isZh ? '信息' : 'INFO',
            success: this.isZh ? '成功' : 'OK',
            warning: this.isZh ? '告警' : 'WARN',
            error: this.isZh ? '错误' : 'ERROR'
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

    close(): void {
        this.closeAction?.();
    }
}
