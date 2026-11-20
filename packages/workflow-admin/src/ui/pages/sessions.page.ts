import { Attribute, Component, Computed } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { HttpClient } from '@tsdi/common/http';
import { ToastService } from '@tsdi/components/common/toast';
import { BadgeModule } from '@tsdi/components/common/badge';
import { ButtonModule } from '@tsdi/components/common/button';
import { EmptyStateModule } from '@tsdi/components/common/empty-state';
import { WorkflowExecutionSnapshot } from '@tsdi/activities/src/visual/types';
import { firstValue } from '../http';
import { WorkflowAdminPageModule } from './page-shell.module';
import { adminLocale, adminText, AdminPageLocale } from './page-shell';
import { matchesQuery, sessionRows, SessionRow } from './page-data';

/**
 * Session page: every workflow execution on this host, newest first. The
 * designer keeps its per-workflow run history; this view is the admin-wide
 * list and lets operators cancel a running execution.
 */
@Component({
    selector: 'workflow-admin-sessions',
    imports: [WorkflowAdminPageModule, ButtonModule, BadgeModule, EmptyStateModule],
    template: `
    <workflow-admin-page :title="title" :subtitle="subtitle" active="sessions" :locale="locale">
        <div class="wa-page-toolbar">
            <input class="wa-page-search" type="search" [value]="query"
                placeholder="{{searchPlaceholder}}" aria-label="{{searchPlaceholder}}"
                @input="queryInput" />
            <ui-button className="wa-page-action" size="sm" :label="refreshLabel"
                :disabled="busy" :action="refreshPressed"></ui-button>
        </div>
        <div class="wa-page-error" v-if="error">{{error}}</div>
        <div class="wa-session-list" v-if="rows.length">
            <div class="wa-session-row" v-for="item in rows" data-execution-id="{{item.id}}">
                <ui-badge class="wa-session-status" :label="statusLabel(item)"
                    :tone="statusTone(item)" :dot="item.status === 'running'"></ui-badge>
                <div class="wa-session-main">
                    <div class="wa-session-title">{{item.workflowId}}</div>
                    <div class="wa-session-meta">
                        <span>{{startedLabel}} {{item.startedAt}}</span>
                        <span>{{durationLabel}} {{item.duration}}</span>
                        <span v-if="item.node">{{nodeLabel}} {{item.node}}</span>
                    </div>
                    <div class="wa-session-error" v-if="item.error">{{item.error}}</div>
                </div>
                <ui-button className="wa-page-action" size="sm" :label="cancelLabel"
                    v-if="item.status === 'running'" :disabled="busyId === item.id"
                    :action="cancelPressed(item)"></ui-button>
            </div>
        </div>
        <ui-empty v-else icon="history" :title="emptyLabel" :hint="emptyHint"></ui-empty>
    </workflow-admin-page>`
})
export class WorkflowAdminSessionsPageComponent {
    @Attribute() locale: AdminPageLocale = adminLocale();
    items: WorkflowExecutionSnapshot[] = [];
    query = '';
    error = '';
    busy = false;
    busyId = '';

    constructor(
        private readonly http: HttpClient,
        @Optional() private translator?: Translator,
        @Optional() private toastService?: ToastService
    ) { }

    async onInit(): Promise<void> {
        await this.load();
    }

    @Computed()
    get rows(): SessionRow[] {
        return sessionRows(this.items, this.locale)
            .filter(item => matchesQuery(this.query, item.id, item.workflowId, item.status));
    }

    get title(): string { return this.t('adminSessions', 'Sessions'); }
    get subtitle(): string { return this.t('sessionsSubtitle', 'Workflow execution sessions on this host.'); }
    get searchPlaceholder(): string { return this.t('sessionsSearch', 'Filter by execution, workflow or status'); }
    get refreshLabel(): string { return this.t('refresh', 'Refresh'); }
    get startedLabel(): string { return this.t('sessionStarted', 'Started'); }
    get durationLabel(): string { return this.t('sessionDuration', 'Duration'); }
    get nodeLabel(): string { return this.t('sessionNode', 'Node'); }
    get cancelLabel(): string { return this.t('sessionCancel', 'Cancel'); }
    get emptyLabel(): string { return this.t('sessionsEmpty', 'No execution sessions yet.'); }
    get emptyHint(): string { return this.t('sessionsEmptyHint', 'Run a workflow to see its execution here.'); }

    statusLabel(item: SessionRow): string {
        switch (item.status) {
            case 'running': return this.t('running', 'Running');
            case 'completed': return this.t('statusCompleted', 'Completed');
            case 'failed': return this.t('statusFailed', 'Failed');
            case 'cancelled': return this.t('statusCancelled', 'Cancelled');
            default: return this.t('statusPending', 'Pending');
        }
    }

    statusTone(item: SessionRow): 'success' | 'error' | 'warning' | 'info' | 'muted' {
        switch (item.status) {
            case 'running': return 'info';
            case 'completed': return 'success';
            case 'failed': return 'error';
            case 'cancelled': return 'warning';
            default: return 'muted';
        }
    }

    readonly queryInput = (event: any): void => {
        this.query = String(event?.target?.value ?? '');
    };

    readonly refreshPressed = (): void => {
        void this.load();
    };

    readonly cancelPressed = (item: SessionRow): (() => void) => () => {
        void this.cancel(item);
    };

    async load(): Promise<void> {
        this.busy = true;
        this.error = '';
        try {
            const items = await firstValue(this.http.get<WorkflowExecutionSnapshot[]>('/api/executions?limit=100'));
            this.items = Array.isArray(items) ? items : [];
        } catch (error) {
            this.error = (error as Error).message;
            this.items = [];
        } finally {
            this.busy = false;
        }
    }

    async cancel(item: SessionRow): Promise<void> {
        if (!item || this.busyId) {
            return;
        }
        this.busyId = item.id;
        this.error = '';
        try {
            await firstValue(this.http.post(`/api/executions/${encodeURIComponent(item.id)}/cancel`, {}));
            this.toastService?.show(
                this.t('sessionCancelled', 'Cancelled {id}', { id: item.workflowId || item.id }),
                { tone: 'info' }
            );
            await this.load();
        } catch (error) {
            this.error = (error as Error).message;
            this.toastService?.show(this.error, { tone: 'error' });
        } finally {
            this.busyId = '';
        }
    }

    private t(key: string, fallback: string, params?: Record<string, any>): string {
        return adminText(this.translator, this.locale, key, fallback, params);
    }
}
