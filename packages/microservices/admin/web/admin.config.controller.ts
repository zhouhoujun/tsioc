import { GatewayConfigDiff, GatewayConfigHistoryEntry, GatewayRouteOptions } from '@tsdi/gateway';
import { GatewayAdminHttp } from './http';
import { countConfigDiff, formatDiffFields } from './admin.state.pure';

/**
 * Host contract implemented by `GatewayAdminState` (the reactive proxy).
 */
export interface AdminConfigHost {
    http?: GatewayAdminHttp;
    routes: GatewayRouteOptions[];
    configVersion: number;
    configDiff?: GatewayConfigDiff;
    configDiffOpen: boolean;
    configHistory: GatewayConfigHistoryEntry[];
    configHistoryOpen: boolean;
    configLoading: boolean;
    error: string;
    status: string;
    t(key: string, params?: Record<string, unknown>): string;
    requireLogin(): void;
    reload(): Promise<void>;
}

/**
 * Gateway config preview/history/rollback controller.
 *
 * Extracted from `GatewayAdminState`; mutates the reactive host so bindings
 * update exactly as before.
 */
export class AdminConfigController {
    constructor(private readonly host: AdminConfigHost) { }

    async loadConfig(): Promise<void> {
        const self = this.host;
        if (!self.http) {
            return;
        }
        const response = await self.http.config();
        if (response.ok) {
            self.configVersion = response.body?.version ?? 0;
        }
    }

    diffFields(diff: GatewayConfigDiff | undefined, kind: 'routes' | 'rules', key: string): string {
        return formatDiffFields(diff, kind, key);
    }

    diffSummary(entry: { diff?: GatewayConfigDiff }): string {
        return this.host.t('config.diffSummary', { count: countConfigDiff(entry.diff) });
    }

    async previewConfigChanges(): Promise<void> {
        const self = this.host;
        if (!self.http) {
            return;
        }
        self.configLoading = true;
        try {
            const response = await self.http.applyConfig({ routes: self.routes, dryRun: true });
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (!response.ok) {
                self.error = self.t('error.previewConfig', { status: response.status });
                return;
            }
            self.configDiff = response.body?.diff;
            self.configDiffOpen = true;
        } finally {
            self.configLoading = false;
        }
    }

    closeConfigDiff(): void {
        const self = this.host;
        self.configDiffOpen = false;
        self.configDiff = undefined;
    }

    async openConfigHistory(): Promise<void> {
        const self = this.host;
        if (!self.http) {
            return;
        }
        self.configLoading = true;
        try {
            const response = await self.http.configHistory();
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (!response.ok) {
                self.error = self.t('error.configHistory', { status: response.status });
                return;
            }
            self.configHistory = Array.isArray(response.body) ? response.body : [];
            self.configHistoryOpen = true;
        } finally {
            self.configLoading = false;
        }
    }

    closeConfigHistory(): void {
        this.host.configHistoryOpen = false;
    }

    async rollbackConfig(version: number): Promise<void> {
        const self = this.host;
        if (!self.http || !version) {
            return;
        }
        self.configLoading = true;
        try {
            const response = await self.http.rollbackConfig(version, self.configVersion);
            if (response.status === 401) {
                self.requireLogin();
                return;
            }
            if (response.status === 409) {
                self.error = self.t('error.configConflict');
                return;
            }
            if (!response.ok) {
                self.error = self.t('error.rollbackConfig', { status: response.status });
                return;
            }
            self.configVersion = response.body?.version ?? self.configVersion;
            self.configHistoryOpen = false;
            await self.reload();
            self.status = self.t('status.configRolledBack', { version });
        } finally {
            self.configLoading = false;
        }
    }
}
