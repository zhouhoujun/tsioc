import { WorkflowPluginManifest } from '@tsdi/activities/src/plugins/types';
import { WorkflowAuditEntry } from '@tsdi/activities/src/visual/workflow-store';
import { WorkflowExecutionSnapshot } from '@tsdi/activities/src/visual/types';
import { AdminPageLocale, formatAdminDuration, formatAdminTime } from './page-shell';

export interface PluginRow extends WorkflowPluginManifest {
    installed: boolean;
    nodeCount: number;
}

export interface PluginCatalog {
    available?: WorkflowPluginManifest[];
    installed?: WorkflowPluginManifest[];
}

/** Merge available and installed plugin lists; installed entries win. */
export function pluginRows(catalog: PluginCatalog | undefined): PluginRow[] {
    const installed = new Set((catalog?.installed || []).map(plugin => plugin.id));
    const merged = new Map<string, PluginRow>();
    for (const plugin of catalog?.available || []) {
        merged.set(plugin.id, {
            ...plugin,
            installed: installed.has(plugin.id),
            nodeCount: plugin.nodes?.length || 0
        });
    }
    for (const plugin of catalog?.installed || []) {
        merged.set(plugin.id, {
            ...plugin,
            installed: true,
            nodeCount: plugin.nodes?.length || 0
        });
    }
    return Array.from(merged.values())
        .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
}

export interface SessionRow {
    id: string;
    workflowId: string;
    status: WorkflowExecutionSnapshot['status'];
    startedAt: string;
    duration: string;
    node: string;
    error: string;
}

export function sessionRows(
    items: WorkflowExecutionSnapshot[] | undefined,
    locale: AdminPageLocale
): SessionRow[] {
    return (items || []).map(item => ({
        id: item.executionId,
        workflowId: item.workflowId,
        status: item.status,
        startedAt: formatAdminTime(item.startTime, locale),
        duration: formatAdminDuration(item.startTime, item.endTime),
        node: item.currentNodeId || '',
        error: item.error || ''
    }));
}

export interface AuditRow {
    id: string;
    time: string;
    action: string;
    workflow: string;
    actor: string;
}

export function auditRows(
    items: WorkflowAuditEntry[] | undefined,
    locale: AdminPageLocale
): AuditRow[] {
    return (items || []).map(item => ({
        id: item.id,
        time: formatAdminTime(item.at, locale),
        action: item.action,
        workflow: item.workflowId || '',
        actor: item.actor || ''
    }));
}

/** Case-insensitive match across the values a page exposes in its filter. */
export function matchesQuery(query: string, ...values: Array<string | undefined | null>): boolean {
    const text = String(query || '').trim().toLowerCase();
    if (!text) {
        return true;
    }
    return values.some(value => String(value ?? '').toLowerCase().includes(text));
}
