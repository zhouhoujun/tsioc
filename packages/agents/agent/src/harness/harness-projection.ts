/**
 * P243 — Harness multi-agent collaboration projection.
 *
 * Pure, deterministic functions that combine delegation tree data
 * ({@link DelegationTreeNode}) with background task history
 * ({@link BackgroundTaskRecord}) into a unified projection for the
 * `/harness tree|list|stop` commands.
 *
 * Two data sources merged:
 *  - **Delegation tree** provides the parent-child hierarchy, edge metadata
 *    (kind, status, timestamps, spawner context).
 *  - **Background tasks** provide per-session runtime status (goal, progress,
 *    error, retry count, usage) for sessions that spawned background work.
 *
 * Everything here is pure (no node API, no I/O) so the same code runs on the
 * agent server and in the cross-platform agent-ui without environment leaks.
 */

import type { DelegationTreeNode, DelegationEdgeStatus } from './DelegationGraphStore';
import type { BackgroundTaskRecord, BackgroundTaskStatus } from '../memory/background-task-store';

// ── Types ────────────────────────────────────────────────────────────────────

/** Unified delegation status combining edge + background task states. */
export type HarnessDelegationStatus = 'active' | 'running' | 'completed' | 'failed' | 'cancelled' | 'pending';

/** Per-node delegation info derived from a tree node + optional background tasks. */
export interface HarnessDelegation {
    /** Session id of this delegation node. */
    sessionId: string;
    /** Parent session id (absent for root). */
    parentSessionId?: string;
    /** Edge id linking this node to its parent. */
    edgeId?: string;
    /** Spawner kind (e.g. `nested`, `spawn_agent`, `parallel`). */
    kind?: string;
    /** Unified status. */
    status: HarnessDelegationStatus;
    /** Aggregation key: `plan:<planId>:step:<stepId>`, `plan:<planId>`, or `session:<sessionId>`. */
    key: string;
    /** Plan id when present in edge metadata. */
    planId?: string;
    /** Step id when present in edge metadata. */
    stepId?: string;
    /** Human-readable goal (from background task or edge metadata). */
    goal?: string;
    /** Model used (from edge metadata). */
    model?: string;
    /** Background task ids associated with this session. */
    taskIds: string[];
    /** Edge creation timestamp (ms). */
    createdAt?: number;
    /** Edge completion timestamp (ms). */
    completedAt?: number;
    /** Number of direct children. */
    childCount: number;
    /** Tree depth relative to root (0 = root). */
    depth: number;
}

/** Live worker execution status derived from background tasks. */
export interface HarnessWorkerStatus {
    /** Session id running the worker. */
    sessionId: string;
    /** Most recent background task id. */
    taskId: string;
    /** Normalized status. */
    status: 'running' | 'completed' | 'failed' | 'cancelled' | 'pending';
    /** Goal description. */
    goal?: string;
    /** Normalized progress 0..1 (from most recent active task). */
    progress?: number;
    /** Start timestamp (ms). */
    startedAt?: number;
    /** Finish timestamp (ms). */
    finishedAt?: number;
    /** Error message if failed. */
    error?: string;
    /** Retry count. */
    retryCount?: number;
}

/** Aggregate counters grouped by plan/step joint key. */
export interface HarnessTaskAggregate {
    /** Aggregation key: `plan:<planId>:step:<stepId>`, `plan:<planId>`, or `session:<sessionId>`. */
    key: string;
    /** Plan id when present. */
    planId?: string;
    /** Step id when present. */
    stepId?: string;
    /** All session ids in this aggregate. */
    sessionIds: string[];
    /** Total delegation nodes. */
    total: number;
    /** Nodes with active/running status. */
    active: number;
    /** Completed nodes. */
    completed: number;
    /** Failed nodes. */
    failed: number;
    /** Cancelled nodes. */
    cancelled: number;
}

/** Full harness projection state. */
export interface HarnessProjection {
    delegations: Map<string, HarnessDelegation>;
    activeWorkers: Map<string, HarnessWorkerStatus>;
    taskAggregates: Map<string, HarnessTaskAggregate>;
}

// ── Key helpers ──────────────────────────────────────────────────────────────

/**
 * Build a joint aggregation key from optional planId/stepId. When both are
 * present the key is `plan:<planId>:step:<stepId>` (the primary joint key
 * from P243). When only planId is present: `plan:<planId>`. Fallback:
 * `session:<sessionId>`.
 */
export function harnessJointKey(
    planId: string | undefined,
    stepId: string | undefined,
    sessionId: string
): string {
    if (planId && stepId) {
        return `plan:${planId}:step:${stepId}`;
    }
    if (planId) {
        return `plan:${planId}`;
    }
    return `session:${sessionId}`;
}

/** Extract planId/stepId from edge metadata (spawner context). */
function extractPlanStep(metadata?: Record<string, any>): { planId?: string; stepId?: string } {
    if (!metadata) return {};
    const planId = typeof metadata.planId === 'string' ? metadata.planId : undefined;
    const stepId = typeof metadata.stepId === 'string' ? metadata.stepId : undefined;
    return { planId, stepId };
}

// ── Status normalization ─────────────────────────────────────────────────────

function delegationStatusToHarness(status?: DelegationEdgeStatus): HarnessDelegationStatus {
    switch (status) {
        case 'active': return 'active';
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        case 'cancelled': return 'cancelled';
        default: return 'pending';
    }
}

function backgroundStatusToHarness(status: BackgroundTaskStatus): HarnessDelegationStatus {
    switch (status) {
        case 'running': return 'running';
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        case 'cancelled': return 'cancelled';
        default: return 'pending';
    }
}

/** Merge edge status with task status: task status wins when more specific. */
function mergeStatus(edgeStatus: HarnessDelegationStatus, taskStatus?: HarnessDelegationStatus): HarnessDelegationStatus {
    if (taskStatus === 'running') return 'running';
    if (taskStatus === 'failed') return 'failed';
    if (taskStatus === 'cancelled') return 'cancelled';
    // If task is completed but edge is still active, prefer 'completed'
    if (taskStatus === 'completed' && edgeStatus === 'active') return 'completed';
    return edgeStatus;
}

// ── Projection builders ──────────────────────────────────────────────────────

/**
 * Build a full harness projection from a delegation tree root and optional
 * background tasks. Deterministic: same inputs always produce the same output.
 *
 * @param root - Delegation tree rooted at the session.
 * @param tasks - Background tasks (may span multiple sessions in the tree).
 * @param parentSessionId - Parent of the root node (absent for top-level root).
 * @param depth - Depth of the root node (default 0).
 */
export function buildHarnessProjection(
    root: DelegationTreeNode,
    tasks?: BackgroundTaskRecord[],
    parentSessionId?: string,
    depth = 0
): HarnessProjection {
    const delegations = new Map<string, HarnessDelegation>();
    const activeWorkers = new Map<string, HarnessWorkerStatus>();
    const taskAggregates = new Map<string, HarnessTaskAggregate>();

    // Index tasks by session id for O(1) lookup
    const tasksBySession = new Map<string, BackgroundTaskRecord[]>();
    if (tasks) {
        for (const task of tasks) {
            const group = tasksBySession.get(task.sessionId) ?? [];
            group.push(task);
            tasksBySession.set(task.sessionId, group);
        }
    }

    const visit = (node: DelegationTreeNode, pSessionId: string | undefined, d: number) => {
        const sessionTasks = tasksBySession.get(node.sessionId) ?? [];
        const mostRecentTask = sessionTasks.length > 0
            ? sessionTasks.reduce((a, b) => (b.startedAt ?? 0) > (a.startedAt ?? 0) ? b : a)
            : undefined;

        // Determine status: merge edge status with most recent task status
        const edgeStatus = delegationStatusToHarness(node.status);
        const taskStatus = mostRecentTask ? backgroundStatusToHarness(mostRecentTask.status) : undefined;
        const status = mergeStatus(edgeStatus, taskStatus);

        // Extract plan/step from edge metadata
        const { planId, stepId } = extractPlanStep(node.metadata);

        // Goal: prefer background task goal, fall back to edge metadata goal
        const goal = mostRecentTask?.goal
            ?? (typeof node.metadata?.goal === 'string' ? node.metadata.goal : undefined);
        const model = typeof node.metadata?.model === 'string' ? node.metadata.model : undefined;

        const key = harnessJointKey(planId, stepId, node.sessionId);
        const taskIds = sessionTasks.map(t => t.id);

        const delegation: HarnessDelegation = {
            sessionId: node.sessionId,
            parentSessionId: pSessionId,
            edgeId: node.edgeId,
            kind: node.kind,
            status,
            key,
            ...(planId ? { planId } : {}),
            ...(stepId ? { stepId } : {}),
            ...(goal ? { goal } : {}),
            ...(model ? { model } : {}),
            taskIds,
            createdAt: node.createdAt,
            completedAt: node.completedAt,
            childCount: node.children.length,
            depth: d
        };

        delegations.set(node.sessionId, delegation);

        // Build worker status for sessions with background tasks
        if (mostRecentTask) {
            const workerStatus = normalizeWorkerStatus(node.sessionId, mostRecentTask);
            activeWorkers.set(node.sessionId, workerStatus);
        }

        // Aggregate by joint key
        upsertAggregate(taskAggregates, key, planId, stepId, node.sessionId, status);

        // Recurse children
        for (const child of node.children) {
            visit(child, node.sessionId, d + 1);
        }
    };

    visit(root, parentSessionId, depth);

    return { delegations, activeWorkers, taskAggregates };
}

function normalizeWorkerStatus(sessionId: string, task: BackgroundTaskRecord): HarnessWorkerStatus {
    let status: HarnessWorkerStatus['status'];
    switch (task.status) {
        case 'running': status = 'running'; break;
        case 'completed': status = 'completed'; break;
        case 'failed': status = 'failed'; break;
        case 'cancelled': status = 'cancelled'; break;
        default: status = 'pending';
    }
    return {
        sessionId,
        taskId: task.id,
        status,
        goal: task.goal,
        progress: typeof task.progress === 'number' ? task.progress : undefined,
        startedAt: task.startedAt,
        finishedAt: task.finishedAt,
        error: task.error,
        retryCount: task.retryCount
    };
}

function upsertAggregate(
    aggregates: Map<string, HarnessTaskAggregate>,
    key: string,
    planId: string | undefined,
    stepId: string | undefined,
    sessionId: string,
    status: HarnessDelegationStatus
): void {
    let agg = aggregates.get(key);
    if (!agg) {
        agg = {
            key,
            ...(planId ? { planId } : {}),
            ...(stepId ? { stepId } : {}),
            sessionIds: [],
            total: 0,
            active: 0,
            completed: 0,
            failed: 0,
            cancelled: 0
        };
        aggregates.set(key, agg);
    }
    agg.sessionIds.push(sessionId);
    agg.total += 1;
    switch (status) {
        case 'active':
        case 'running':
            agg.active += 1;
            break;
        case 'completed':
            agg.completed += 1;
            break;
        case 'failed':
            agg.failed += 1;
            break;
        case 'cancelled':
            agg.cancelled += 1;
            break;
        default:
            break;
    }
}

// ── Derived projections ──────────────────────────────────────────────────────

/** Flat list of delegations sorted by createdAt ascending (oldest first). */
export function buildHarnessList(projection: HarnessProjection): HarnessDelegation[] {
    return Array.from(projection.delegations.values())
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || a.sessionId.localeCompare(b.sessionId));
}

/** Lineage chain from a given session up to the root, closest ancestor first. */
export function buildHarnessAncestors(
    projection: HarnessProjection,
    sessionId: string
): HarnessDelegation[] {
    const ancestors: HarnessDelegation[] = [];
    const seen = new Set<string>();
    let current = sessionId;
    let guard = 0;
    while (current && !seen.has(current) && guard++ < 1024) {
        seen.add(current);
        const delegation = projection.delegations.get(current);
        if (!delegation) break;
        if (delegation.parentSessionId) {
            const parent = projection.delegations.get(delegation.parentSessionId);
            if (parent) {
                ancestors.push(parent);
            }
        }
        current = delegation.parentSessionId ?? '';
    }
    return ancestors;
}

// ── Text formatting ──────────────────────────────────────────────────────────

/** Shorten a session id for display: first 8 chars + `…` when > 12 chars. */
export function shortenHarnessSessionId(id: string): string {
    if (id.length <= 12) return id;
    return `${id.slice(0, 8)}…`;
}

/** Format a single delegation as a compact digest line. */
export function formatHarnessDelegationLine(d: HarnessDelegation): string {
    const id = shortenHarnessSessionId(d.sessionId);
    const parts = [id];
    if (d.kind) parts.push(d.kind);
    parts.push(statusIcon(d.status));
    if (d.goal) parts.push(d.goal);
    if (d.taskIds.length > 0) parts.push(`${d.taskIds.length} task(s)`);
    if (d.childCount > 0) parts.push(`${d.childCount} child(ren)`);
    const range = formatTimeRange(d.createdAt, d.completedAt);
    if (range) parts.push(range);
    return parts.join(' · ');
}

/**
 * Render a delegation tree as indented lines with branch prefixes
 * (`├─`, `└─`, `│`). The root node is rendered without a prefix.
 */
export function formatHarnessTreeLines(root: DelegationTreeNode, projection?: HarnessProjection): string[] {
    const formatNode = (node: DelegationTreeNode): string => {
        const projected = projection?.delegations.get(node.sessionId);
        const id = shortenHarnessSessionId(node.sessionId);
        const kind = (projected?.kind ?? node.kind) ? ` ${projected?.kind ?? node.kind}` : '';
        const status = statusIcon(projected?.status ?? node.status);
        const goal = projected?.goal ? ` · ${projected.goal}` : '';
        return `${id}${kind} ${status}${goal}`;
    };
    const lines: string[] = [formatNode(root)];
    const visit = (node: DelegationTreeNode, prefix: string, isLast: boolean) => {
        const branch = isLast ? '└─' : '├─';
        const connector = isLast ? '   ' : '│ ';
        lines.push(`${prefix}${branch} ${formatNode(node)}`);
        for (let i = 0; i < node.children.length; i++) {
            visit(node.children[i], prefix + connector, i === node.children.length - 1);
        }
    };
    for (let i = 0; i < root.children.length; i++) {
        visit(root.children[i], '', i === root.children.length - 1);
    }
    return lines;
}

/**
 * Render the full projection as a flat list of lines (for `/harness list`).
 * Each delegation node gets one line; aggregates are appended as a summary.
 */
export function formatHarnessListLines(projection: HarnessProjection): string[] {
    const list = buildHarnessList(projection);
    if (list.length === 0) return [];
    const lines = list.map(d => formatHarnessDelegationLine(d));

    // Append aggregate summary when there are joint-key groups
    const aggregates = Array.from(projection.taskAggregates.values())
        .filter(a => a.total > 1 || a.key.startsWith('plan:'));
    if (aggregates.length > 0) {
        lines.push('');
        lines.push('─ aggregates ─');
        for (const agg of aggregates) {
            const parts = [agg.key, `${agg.total} total`];
            if (agg.active > 0) parts.push(`${agg.active} active`);
            if (agg.completed > 0) parts.push(`${agg.completed} done`);
            if (agg.failed > 0) parts.push(`${agg.failed} failed`);
            if (agg.cancelled > 0) parts.push(`${agg.cancelled} cancelled`);
            lines.push(parts.join(' · '));
        }
    }

    return lines;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusIcon(status: HarnessDelegationStatus | DelegationEdgeStatus | BackgroundTaskStatus | undefined): string {
    switch (status) {
        case 'active': return '●';
        case 'running': return '▶';
        case 'completed': return '✓';
        case 'failed': return '✗';
        case 'cancelled': return '⊘';
        case 'pending': return '○';
        default: return '?';
    }
}

function formatTimeRange(start?: number, end?: number): string | undefined {
    if (!start) return undefined;
    if (end) {
        return `${new Date(start).toLocaleString()} → ${new Date(end).toLocaleString()}`;
    }
    return new Date(start).toLocaleString();
}
