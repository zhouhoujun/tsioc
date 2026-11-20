import { Attribute, Component, Computed } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { HttpClient } from '@tsdi/common/http';
import { ButtonModule } from '@tsdi/components/common/button';
import { DataTableModule } from '@tsdi/components/common/data-table';
import { WorkflowAuditEntry } from '@tsdi/activities/src/visual/workflow-store';
import { firstValue } from '../http';
import { WorkflowAdminPageModule } from './page-shell.module';
import { adminLocale, adminText, AdminPageLocale } from './page-shell';
import { auditRows, AuditRow, matchesQuery } from './page-data';

/**
 * Admin-wide audit log: configuration, deployment, publish and plugin
 * changes independent of the active workflow tab.
 */
@Component({
    selector: 'workflow-admin-audit',
    imports: [WorkflowAdminPageModule, ButtonModule, DataTableModule],
    template: `
    <workflow-admin-page :title="title" :subtitle="subtitle" active="audit" :locale="locale">
        <div class="wa-page-toolbar">
            <input class="wa-page-search" type="search" [value]="query"
                placeholder="{{searchPlaceholder}}" aria-label="{{searchPlaceholder}}"
                @input="queryInput" />
            <select class="wa-page-select" [value]="actionFilter" aria-label="{{actionLabel}}"
                @change="actionInput">
                <option value="">{{allActionsLabel}}</option>
                <option v-for="action in actions" :value="action">{{action}}</option>
            </select>
            <ui-button className="wa-page-action" size="sm" :label="refreshLabel"
                :disabled="busy" :action="refreshPressed"></ui-button>
        </div>
        <div class="wa-page-error" v-if="error">{{error}}</div>
        <ui-data-table class="wa-audit-table" :columns="columns" :rows="rows"
            rowKey="id" dense :ariaLabel="title" :emptyLabel="emptyLabel"></ui-data-table>
    </workflow-admin-page>`
})
export class WorkflowAdminAuditPageComponent {
    @Attribute() locale: AdminPageLocale = adminLocale();
    items: WorkflowAuditEntry[] = [];
    query = '';
    actionFilter = '';
    error = '';
    busy = false;

    constructor(
        private readonly http: HttpClient,
        @Optional() private translator?: Translator
    ) { }

    async onInit(): Promise<void> {
        await this.load();
    }

    get actions(): string[] {
        return Array.from(new Set(this.items.map(item => item.action).filter(Boolean))).sort();
    }

    @Computed()
    get rows(): AuditRow[] {
        return auditRows(this.items, this.locale).filter(row =>
            (!this.actionFilter || row.action === this.actionFilter)
            && matchesQuery(this.query, row.action, row.workflow, row.actor, row.time)
        );
    }

    @Computed()
    get columns(): Array<{ key: string; label: string }> {
        return [
            { key: 'time', label: this.t('time', 'Time') },
            { key: 'action', label: this.t('action', 'Action') },
            { key: 'workflow', label: this.t('workflow', 'Workflow') },
            { key: 'actor', label: this.t('actor', 'Actor') }
        ];
    }

    get title(): string { return this.t('audit', 'Audit log'); }
    get subtitle(): string { return this.t('auditSubtitle', 'Configuration, deployment and plugin changes.'); }
    get searchPlaceholder(): string { return this.t('auditSearch', 'Filter by action, workflow or actor'); }
    get actionLabel(): string { return this.t('action', 'Action'); }
    get allActionsLabel(): string { return this.t('auditAllActions', 'All actions'); }
    get refreshLabel(): string { return this.t('refresh', 'Refresh'); }
    get emptyLabel(): string { return this.t('auditEmpty', 'No audit entries for this workflow.'); }

    readonly queryInput = (event: any): void => {
        this.query = String(event?.target?.value ?? '');
    };

    readonly actionInput = (event: any): void => {
        this.actionFilter = String(event?.target?.value ?? '');
    };

    readonly refreshPressed = (): void => {
        void this.load();
    };

    async load(): Promise<void> {
        this.busy = true;
        this.error = '';
        try {
            const items = await firstValue(this.http.get<WorkflowAuditEntry[]>('/api/audit?limit=200'));
            this.items = Array.isArray(items) ? items : [];
        } catch (error) {
            this.error = (error as Error).message;
            this.items = [];
        } finally {
            this.busy = false;
        }
    }

    private t(key: string, fallback: string): string {
        return adminText(this.translator, this.locale, key, fallback);
    }
}
