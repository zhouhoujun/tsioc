import { resolveSessionProjectKey } from '@tsdi/agent-ui';
import type { AgentConsoleProjectItem, AgentConsoleSessionItem } from '@tsdi/agent-ui';

/**
 * Renderer-neutral projection for the browser sidebar's project/session
 * finders. Keeping the filtering and grouping pure makes the DOM adapter a
 * thin shell and lets both the sidebar and the palette share one source of
 * truth (the same sessions/projects the console already owns).
 */

export interface AgentConsoleWebSessionFilterInput {
    sessions: AgentConsoleSessionItem[];
    projects?: AgentConsoleProjectItem[];
    /** Free text matched against session title/summary/id/workspace/project. */
    query?: string;
    /** Restricts results to one project key ('' = every project). */
    projectKey?: string;
    /** Caps the rendered result count (default: no cap). */
    limit?: number;
}

export type AgentConsoleWebSessionGroupKey = 'today' | 'yesterday' | 'previous7Days' | 'older' | 'unknownDate';

export interface AgentConsoleWebSessionGroup {
    key: AgentConsoleWebSessionGroupKey;
    sessions: AgentConsoleSessionItem[];
}

const DEFAULT_PROJECT_KEY = 'workspace:default';
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeWebSidebarQuery(value?: string): string {
    return String(value ?? '').trim().toLowerCase();
}

/** Project key shared with the terminal console (project > thread > workspace). */
export function resolveWebSidebarProjectKey(session?: Partial<AgentConsoleSessionItem> | null): string {
    return resolveSessionProjectKey(session) || DEFAULT_PROJECT_KEY;
}

function folderName(value: unknown): string {
    const parts = String(value || '').trim().replace(/[\\/]+$/, '').split(/[\\/]+/).filter(Boolean);
    return parts[parts.length - 1] || '';
}

/**
 * The console may hand the sidebar a full workspace path as the project
 * label; the column is narrow, so paths collapse to their folder name.
 */
function shortProjectLabel(value: unknown): string {
    const text = String(value || '').trim();
    return /[\\/]/.test(text) ? folderName(text) : text;
}

/** Human label for a project: explicit label, else project id, else folder name. */
export function resolveWebSidebarProjectLabel(session?: Partial<AgentConsoleSessionItem> | null): string {
    const explicit = shortProjectLabel(session?.projectLabel);
    if (explicit) {
        return explicit;
    }
    const projectId = String(session?.projectId || '').trim();
    if (projectId) {
        return projectId;
    }
    return folderName(session?.workspace);
}

/**
 * Merge the console's project index with the projects implied by the loaded
 * sessions. Counts are recomputed from the sessions so an index row can never
 * double-count (the terminal console flattens sessions per project already).
 */
export function buildWebSidebarProjects(
    sessions: AgentConsoleSessionItem[] = [],
    projects: AgentConsoleProjectItem[] = []
): AgentConsoleProjectItem[] {
    const merged = new Map<string, AgentConsoleProjectItem>();
    for (const project of projects || []) {
        const key = String(project?.key || '').trim();
        if (!key) {
            continue;
        }
        merged.set(key, {
            key,
            label: shortProjectLabel(project.label) || key,
            sessionCount: 0,
            lastActive: Number(project.lastActive) || undefined
        });
    }
    for (const session of sessions || []) {
        const key = resolveWebSidebarProjectKey(session);
        const label = resolveWebSidebarProjectLabel(session);
        const existing = merged.get(key);
        if (existing) {
            existing.sessionCount += 1;
            if (label && (!existing.label || existing.label === key)) {
                existing.label = label;
            }
            existing.lastActive = Math.max(existing.lastActive || 0, Number(session.updatedAt) || 0) || existing.lastActive;
            continue;
        }
        merged.set(key, {
            key,
            label: label || key,
            sessionCount: 1,
            lastActive: Number(session.updatedAt) || undefined
        });
    }
    return [...merged.values()].sort((left, right) =>
        (right.lastActive || 0) - (left.lastActive || 0)
        || String(left.label).localeCompare(String(right.label))
    );
}

/** Project picker search: matches the label, the key and the folder name. */
export function searchWebSidebarProjects(
    projects: AgentConsoleProjectItem[] = [],
    query?: string
): AgentConsoleProjectItem[] {
    const text = normalizeWebSidebarQuery(query);
    if (!text) {
        return (projects || []).slice();
    }
    return (projects || []).filter(project => {
        const haystack = [project.label, project.key].map(value => String(value || '')).join(' ').toLowerCase();
        return haystack.includes(text);
    });
}

export function matchWebSidebarSession(session: AgentConsoleSessionItem, query?: string): boolean {
    const text = normalizeWebSidebarQuery(query);
    if (!text) {
        return true;
    }
    const haystack = [
        session?.title,
        session?.summary,
        session?.id,
        session?.workspace,
        session?.projectId,
        session?.projectLabel,
        session?.focusSummary,
        session?.rootRequest
    ].map(value => String(value || '')).join(' ').toLowerCase();
    return haystack.includes(text);
}

export function filterWebSidebarSessions(input: AgentConsoleWebSessionFilterInput): AgentConsoleSessionItem[] {
    const projectKey = String(input?.projectKey || '').trim();
    const limit = typeof input?.limit === 'number' && input.limit > 0 ? Math.floor(input.limit) : 0;
    const matches = (input?.sessions || []).filter(session => {
        if (projectKey && resolveWebSidebarProjectKey(session) !== projectKey) {
            return false;
        }
        return matchWebSidebarSession(session, input?.query);
    });
    return limit ? matches.slice(0, limit) : matches;
}

function sessionGroupKey(updatedAt: unknown, now: number): AgentConsoleWebSessionGroupKey {
    const at = Number(updatedAt) || 0;
    if (!at) {
        return 'unknownDate';
    }
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const todayStart = startOfToday.getTime();
    if (at >= todayStart) {
        return 'today';
    }
    if (at >= todayStart - DAY_MS) {
        return 'yesterday';
    }
    return at >= todayStart - 7 * DAY_MS ? 'previous7Days' : 'older';
}

const GROUP_ORDER: AgentConsoleWebSessionGroupKey[] = ['today', 'yesterday', 'previous7Days', 'older', 'unknownDate'];

/** Date buckets in opencode's order, newest activity first inside each bucket. */
export function groupWebSidebarSessions(
    sessions: AgentConsoleSessionItem[] = [],
    now: number = Date.now()
): AgentConsoleWebSessionGroup[] {
    const buckets = new Map<AgentConsoleWebSessionGroupKey, AgentConsoleSessionItem[]>();
    for (const session of sessions || []) {
        const key = sessionGroupKey(session?.updatedAt, now);
        const bucket = buckets.get(key);
        if (bucket) {
            bucket.push(session);
        } else {
            buckets.set(key, [session]);
        }
    }
    return GROUP_ORDER
        .filter(key => (buckets.get(key) || []).length > 0)
        .map(key => ({
            key,
            sessions: (buckets.get(key) as AgentConsoleSessionItem[])
                .slice()
                .sort((left, right) => (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0))
        }));
}
