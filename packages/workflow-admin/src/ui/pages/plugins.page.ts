import { Attribute, Component, Computed } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { HttpClient } from '@tsdi/common/http';
import { ToastService } from '@tsdi/components/common/toast';
import { BadgeModule } from '@tsdi/components/common/badge';
import { ButtonModule } from '@tsdi/components/common/button';
import { EmptyStateModule } from '@tsdi/components/common/empty-state';
import { firstValue } from '../http';
import { WorkflowAdminPageModule } from './page-shell.module';
import { adminLocale, adminText, AdminPageLocale } from './page-shell';
import { matchesQuery, PluginCatalog, pluginRows, PluginRow } from './page-data';

/**
 * Plugin manager page. Lists the host catalog, installs/uninstalls nodes and
 * reports the result through the shared toast queue.
 */
@Component({
    selector: 'workflow-admin-plugins',
    imports: [WorkflowAdminPageModule, ButtonModule, BadgeModule, EmptyStateModule],
    template: `
    <workflow-admin-page :title="title" :subtitle="subtitle" active="plugins" :locale="locale">
        <div class="wa-page-toolbar">
            <input class="wa-page-search" type="search" [value]="query"
                placeholder="{{searchPlaceholder}}" aria-label="{{searchPlaceholder}}"
                @input="queryInput" />
            <ui-button className="wa-page-action" size="sm" :label="refreshLabel"
                :disabled="busy" :action="refreshPressed"></ui-button>
        </div>
        <div class="wa-page-error" v-if="error">{{error}}</div>
        <div class="wa-plugin-list" v-if="rows.length">
            <div class="wa-plugin-row" v-for="item in rows" data-plugin-id="{{item.id}}">
                <div class="wa-plugin-main">
                    <div class="wa-plugin-title">
                        <span>{{item.name || item.id}}</span>
                        <span class="wa-plugin-version" v-if="item.version">v{{item.version}}</span>
                        <ui-badge :label="item.installed ? installedLabel : availableLabel"
                            :tone="item.installed ? 'success' : 'muted'" :dot="item.installed"></ui-badge>
                    </div>
                    <div class="wa-plugin-meta">
                        <span class="wa-plugin-id">{{item.id}}</span>
                        <span class="wa-plugin-nodes">{{nodeCountLabel(item)}}</span>
                    </div>
                    <p class="wa-plugin-description" v-if="item.description">{{item.description}}</p>
                </div>
                <ui-button className="wa-page-action" size="sm"
                    :label="item.installed ? uninstallLabel : installLabel"
                    :disabled="busyId === item.id"
                    :action="togglePressed(item)"></ui-button>
            </div>
        </div>
        <ui-empty v-else icon="plugin" :title="emptyLabel" :hint="emptyHint"></ui-empty>
    </workflow-admin-page>`
})
export class WorkflowAdminPluginsPageComponent {
    @Attribute() locale: AdminPageLocale = adminLocale();
    items: PluginRow[] = [];
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
    get rows(): PluginRow[] {
        return this.items.filter(item => matchesQuery(this.query, item.id, item.name, item.description));
    }

    get title(): string { return this.t('plugins', 'Plugins'); }
    get subtitle(): string { return this.t('pluginsSubtitle', 'Install node plugins for the workflow editor.'); }
    get searchPlaceholder(): string { return this.t('search', 'Search'); }
    get refreshLabel(): string { return this.t('refresh', 'Refresh'); }
    get installLabel(): string { return this.t('pluginInstall', 'Install'); }
    get uninstallLabel(): string { return this.t('pluginUninstall', 'Uninstall'); }
    get installedLabel(): string { return this.t('pluginInstalled', 'Installed'); }
    get availableLabel(): string { return this.t('pluginsAvailable', 'Available'); }
    get emptyLabel(): string { return this.t('pluginsEmpty', 'No plugins are available on this host.'); }
    get emptyHint(): string { return this.t('pluginsEmptyHint', 'This host did not report a plugin catalog.'); }

    nodeCountLabel(item: PluginRow): string {
        return this.t('pluginNodeCount', '{count} nodes', { count: item.nodeCount });
    }

    readonly queryInput = (event: any): void => {
        this.query = String(event?.target?.value ?? '');
    };

    readonly refreshPressed = (): void => {
        void this.load();
    };

    readonly togglePressed = (item: PluginRow): (() => void) => () => {
        void this.toggle(item);
    };

    async load(): Promise<void> {
        this.busy = true;
        this.error = '';
        try {
            const catalog = await firstValue(this.http.get<PluginCatalog>('/api/plugins'));
            this.items = pluginRows(catalog);
        } catch (error) {
            this.error = (error as Error).message;
            this.items = [];
        } finally {
            this.busy = false;
        }
    }

    async toggle(item: PluginRow): Promise<void> {
        if (!item || this.busyId) {
            return;
        }
        this.busyId = item.id;
        this.error = '';
        try {
            if (item.installed) {
                await firstValue(this.http.delete(`/api/plugins/${encodeURIComponent(item.id)}`));
                this.notify(this.t('toastPluginUninstalled', 'Uninstalled {name}', { name: item.name || item.id }), 'info');
            } else {
                await firstValue(this.http.post(`/api/plugins/${encodeURIComponent(item.id)}/install`, {}));
                this.notify(this.t('toastPluginInstalled', 'Installed {name}', { name: item.name || item.id }), 'success');
            }
            await this.load();
        } catch (error) {
            this.error = (error as Error).message;
            this.notify(this.error, 'error');
        } finally {
            this.busyId = '';
        }
    }

    private notify(message: string, tone: 'info' | 'success' | 'warning' | 'error'): void {
        // The page shell paints the shared strip bound to this same service.
        this.toastService?.show(message, { tone });
    }

    private t(key: string, fallback: string, params?: Record<string, any>): string {
        return adminText(this.translator, this.locale, key, fallback, params);
    }
}
