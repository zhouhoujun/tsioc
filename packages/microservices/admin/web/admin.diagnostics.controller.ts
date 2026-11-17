import { GatewayRuntimeSnapshot } from '@tsdi/gateway';
import { GatewayAdminHttp } from './http';
import { buildSloAlertsCsv } from './admin.state.pure';
import { downloadTextFile } from './admin.download';

interface AdminDocumentLike {
    createElement?: (tag: string) => any;
}

export interface AdminDiagnosticsHost {
    http?: GatewayAdminHttp;
    diagnostics?: GatewayRuntimeSnapshot;
    serviceDetails: any[];
    status: string;
    documentRef?: AdminDocumentLike;
    t(key: string, params?: Record<string, unknown>): string;
}

/**
 * Diagnostics/services loading and SLO alert export controller.
 *
 * Extracted from `GatewayAdminState`; derived getters stay on the state so
 * templates keep reading the same properties.
 */
export class AdminDiagnosticsController {
    constructor(private readonly host: AdminDiagnosticsHost) { }

    async loadServices(): Promise<void> {
        const self = this.host;
        if (!self.http) {
            return;
        }
        const response = await self.http.services();
        if (response.ok) {
            self.serviceDetails = Array.isArray(response.body) ? response.body : [];
        }
    }

    async loadDiagnostics(): Promise<void> {
        const self = this.host;
        if (!self.http) {
            return;
        }
        const response = await self.http.diagnostics();
        if (response.ok) {
            self.diagnostics = response.body;
        }
    }

    exportSloAlerts(): void {
        const self = this.host;
        const data = JSON.stringify(self.diagnostics?.alerts ?? [], null, 2);
        const doc = (self.documentRef ?? (globalThis as { document?: Document }).document) as Document | undefined;
        downloadTextFile(doc, 'gateway-slo-alerts.json', data, 'application/json');
        self.status = self.t('status.sloExported');
    }

    exportSloAlertsCsv(): void {
        const self = this.host;
        const csv = buildSloAlertsCsv(self.diagnostics?.alerts ?? []);
        const doc = (self.documentRef ?? (globalThis as { document?: Document }).document) as Document | undefined;
        downloadTextFile(doc, 'gateway-slo-alerts.csv', csv, 'text/csv;charset=utf-8');
        self.status = self.t('status.sloExported');
    }
}
