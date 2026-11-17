import { GatewayConfigDiff, GatewayRouteOptions, GatewaySloAlert } from '@tsdi/gateway';

/**
 * Pure helpers for the gateway admin console.
 *
 * Extracted from `GatewayAdminState` so formatting, CSV export and route
 * validation can be tested without mounting components.
 */
export function formatAlertTime(timestamp: number): string {
    try {
        return new Date(timestamp).toISOString().slice(11, 19);
    } catch {
        return '';
    }
}

export function buildSloAlertsCsv(alerts: readonly GatewaySloAlert[]): string {
    const header = ['key', 'timestamp', 'isoTime', 'errorRate', 'p95Ms', 'errorRateThreshold', 'p95ThresholdMs'];
    const rows = alerts.map(alert => [
        alert.key,
        String(alert.timestamp),
        new Date(alert.timestamp).toISOString(),
        String(alert.errorRate),
        String(alert.p95Ms),
        alert.errorRateThreshold == null ? '' : String(alert.errorRateThreshold),
        alert.p95ThresholdMs == null ? '' : String(alert.p95ThresholdMs)
    ]);
    return [header, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
}

export function formatDiffValue(value: any): string {
    if (value === undefined) {
        return 'undefined';
    }
    if (value === null) {
        return 'null';
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export function formatDiffFields(
    diff: GatewayConfigDiff | undefined,
    kind: 'routes' | 'rules',
    key: string
): string {
    const fields = diff?.[kind]?.changedFields?.[key];
    if (!fields?.length) {
        return '';
    }
    const values = diff?.[kind]?.changedValues?.[key] ?? {};
    return fields.map(field => {
        const change = values[field];
        if (!change) {
            return field;
        }
        return `${field}: ${formatDiffValue(change.before)} → ${formatDiffValue(change.after)}`;
    }).join(', ');
}

export function countConfigDiff(diff: GatewayConfigDiff | undefined): number {
    return diff
        ? diff.routes.added.length + diff.routes.removed.length + diff.routes.changed.length
            + diff.rules.added.length + diff.rules.removed.length + diff.rules.changed.length
            + diff.options.length
        : 0;
}

export function routeMethodsKey(route: GatewayRouteOptions): string {
    const methods = (route.methods ?? [])
        .map(method => String(method).trim().toUpperCase())
        .filter(Boolean);
    return (methods.length ? Array.from(new Set(methods)).sort() : ['ANY']).join(',');
}

export interface RouteValidationOptions {
    t: (key: string) => string;
    routes: readonly GatewayRouteOptions[];
    index?: number;
}

export function validateRouteFields(
    route: GatewayRouteOptions,
    options: RouteValidationOptions
): Record<string, string> {
    const errors: Record<string, string> = {};
    const t = options.t;
    const path = String(route.path || '').trim();
    if (!path) {
        errors.path = t('validation.pathRequired');
    } else if (!path.startsWith('/')) {
        errors.path = t('validation.pathSlash');
    } else if (/\s/.test(path)) {
        errors.path = t('validation.pathSpace');
    }
    if (!route.service && !route.targetUrl) {
        errors.service = t('validation.serviceRequired');
    }
    if (route.targetUrl && !/^(https?:\/\/|\/)/i.test(String(route.targetUrl))) {
        errors.targetUrl = t('validation.url');
    }
    if (route.targetPath && !String(route.targetPath).startsWith('/')) {
        errors.targetPath = t('validation.pathSlash');
    }
    if (route.timeout !== undefined && route.timeout !== null) {
        const timeout = Number(route.timeout);
        if (!Number.isFinite(timeout) || timeout < 0 || timeout > 600000) {
            errors.timeout = t('validation.timeout');
        }
    }
    const allowed = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'];
    const methods = (route.methods ?? []).map(method => String(method).trim().toUpperCase()).filter(Boolean);
    if (methods.some(method => !allowed.includes(method))) {
        errors.methods = t('validation.methods');
    }
    const index = options.index ?? -1;
    const methodKey = routeMethodsKey(route);
    const duplicate = options.routes.some((item, itemIndex) =>
        itemIndex !== index
        && String(item.path || '').trim() === path
        && routeMethodsKey(item) === methodKey);
    if (duplicate) {
        errors.path = t('validation.duplicate');
    }
    if (route.slo) {
        const errorRate = route.slo.errorRateThreshold;
        const p95 = route.slo.p95ThresholdMs;
        if (errorRate != null && (!Number.isFinite(Number(errorRate)) || Number(errorRate) < 0 || Number(errorRate) > 1)) {
            errors.slo = t('validation.sloErrorRate');
        } else if (p95 != null && (!Number.isFinite(Number(p95)) || Number(p95) <= 0)) {
            errors.slo = t('validation.sloP95');
        }
    }
    return errors;
}
