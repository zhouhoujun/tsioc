import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowAuditEntry } from '../workflow-store';

/**
 * Read-only audit trail for the active workflow. Purely presentational: the
 * host owns the entries/busy/error state and performs the load, which keeps
 * updates on the host's reactive instance.
 */
@Component({
    selector: 'workflow-audit-panel',
    template: `
    <div class="workflow-publish workflow-audit">
        <div class="workflow-publish-panel workflow-audit-panel">
            <div class="workflow-publish-head">
                <span class="workflow-publish-title">{{title}}</span>
                <button class="workflow-btn workflow-publish-close" type="button"
                    [aria-label]="closeLabel" [title]="closeLabel" @click="close">✕</button>
            </div>
            <div class="workflow-publish-error" v-if="error">{{error}}</div>
            <ui-data-table class="workflow-audit-list" v-if="rows.length"
                :columns="columns" :rows="rows" rowKey="id" dense :ariaLabel="title"></ui-data-table>
            <ui-empty class="workflow-audit-empty" v-else icon="history" :title="emptyLabel"></ui-empty>
            <div class="workflow-publish-actions">
                <ui-button className="workflow-btn" :label="refreshLabel" :disabled="busy" :action="refreshPressed"></ui-button>
                <ui-button className="workflow-btn" :label="closeLabel" :action="closePressed"></ui-button>
            </div>
        </div>
    </div>`
})
export class WorkflowAuditPanelComponent {
    @Attribute() items: WorkflowAuditEntry[] = [];
    @Attribute() busy = false;
    @Attribute() error = '';
    @Attribute() locale = 'zh-CN';
    @Attribute() refreshAction?: () => void;
    @Attribute() closeAction?: () => void;

    constructor(@Optional() private translator?: Translator) { }

    readonly refreshPressed = (): void => this.refresh();

    readonly closePressed = (): void => this.close();

    refresh(): void {
        this.refreshAction?.();
    }

    close(): void {
        this.closeAction?.();
    }

    get columns(): Array<{ key: string; label: string }> {
        return [
            { key: 'time', label: this.t('time', 'Time') },
            { key: 'action', label: this.t('action', 'Action') },
            { key: 'workflow', label: this.t('workflow', 'Workflow') },
            { key: 'actor', label: this.t('actor', 'Actor') }
        ];
    }

    get rows(): Array<Record<string, any>> {
        return (this.items || []).map(entry => ({
            id: entry.id,
            time: this.formatTime(entry.at),
            action: entry.action,
            workflow: entry.workflowId || '',
            actor: entry.actor || ''
        }));
    }

    formatTime(at: number): string {
        const date = new Date(at);
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    get title(): string { return this.t('audit', 'Audit log'); }
    get emptyLabel(): string { return this.t('auditEmpty', 'No audit entries for this workflow.'); }
    get refreshLabel(): string { return this.t('refresh', 'Refresh'); }
    get closeLabel(): string { return this.t('close', 'Close'); }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            String(this.locale || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN',
            `workflow.ui.${key}`,
            fallback
        );
    }
}
