import { Abstract, Injectable, token } from '@tsdi/ioc';

/**
 * Durable background task history model + store contract (P231/P236).
 *
 * BackgroundTaskManager keeps a live process-local Map for fast in-turn access,
 * but that snapshot does not survive a restart and can't be paged. This store is
 * the durable, cursor-paged control-plane projection of background task history:
 * it enriches the record with progress/elapsed/retry/usage/failure-cause and
 * exposes cursor paging, per-session listing, batch cancel and subscription so a
 * remote host (or a fresh process) can reconstruct consistent task history across
 * restarts and SSE re-pulls.
 *
 * The contract lives in `@tsdi/agent` (alongside the other ORM-backed contracts
 * such as TimelineHistoryStore and GoalStore) so a durable TypeOrm implementation
 * can be co-located without creating an `agent -> agent-tools` dependency cycle.
 */

export type BackgroundTaskStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTaskReport {
    summary?: string;
    diff?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
}

export interface BackgroundTaskRunResult {
    content: string;
    sessionId?: string;
    turnCount: number;
    toolCalls: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
    report?: BackgroundTaskReport;
}

/**
 * A background task history record. All fields beyond the id/sessionId/status/
 * goal/timestamps are optional to keep the shape backward compatible; consumers
 * that only need the in-process snapshot can ignore the extra fields.
 */
export interface BackgroundTaskRecord {
    id: string;
    sessionId: string;
    status: BackgroundTaskStatus;
    goal: string;
    startedAt: number;
    finishedAt?: number;
    result?: BackgroundTaskRunResult;
    error?: string;
    /** Normalized 0..1 progress reported while running, when the runner reports it. */
    progress?: number;
    /** Number of retries already attempted for this task. */
    retryCount?: number;
    /** Aggregate token/usage snapshot carried on completion/failure. */
    usage?: Record<string, any>;
    /** Structured failure cause (e.g. { kind, detail }) beyond the free-text error. */
    cause?: { kind?: string; detail?: string };
    /** Last mutation timestamp; derived elapsed = updatedAt - startedAt. */
    updatedAt?: number;
}

/** Opaque, stable cursor token for cursor-based paging (startedAt desc + id tiebreak). */
export type BackgroundTaskCursor = string;

export interface BackgroundTaskPageOptions {
    cursor?: BackgroundTaskCursor;
    limit?: number;
}

export interface BackgroundTaskPage {
    items: BackgroundTaskRecord[];
    nextCursor?: BackgroundTaskCursor;
    hasMore: boolean;
}

export interface BackgroundTaskHistoryListener {
    (record: BackgroundTaskRecord): void;
}

/**
 * Cursor encoding: `${startedAt.toString(36)}_${id}`. The cursor points at a
 * (startedAt, id) pair; paging returns records strictly "after" it in a
 * startedAt-desc, id-asc stable ordering so concurrent same-timestamp records
 * are not skipped or duplicated across pages.
 */
export function encodeBackgroundTaskCursor(record: Pick<BackgroundTaskRecord, 'startedAt' | 'id'>): BackgroundTaskCursor {
    return `${record.startedAt.toString(36)}_${record.id}`;
}

function compareRecordsDesc(left: BackgroundTaskRecord, right: BackgroundTaskRecord): number {
    if (right.startedAt !== left.startedAt) {
        return right.startedAt - left.startedAt;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export interface DecodedCursor {
    startedAt: number;
    id: string;
}

export function decodeBackgroundTaskCursor(cursor?: BackgroundTaskCursor): DecodedCursor | undefined {
    if (!cursor) return undefined;
    const sep = cursor.indexOf('_');
    if (sep < 0) return undefined;
    const startedAt = Number.parseInt(cursor.slice(0, sep), 36);
    const id = cursor.slice(sep + 1);
    if (!Number.isFinite(startedAt) || !id) return undefined;
    return { startedAt, id };
}

export function cloneBackgroundTaskRecord(record: BackgroundTaskRecord): BackgroundTaskRecord {
    const next: BackgroundTaskRecord = {
        ...record,
        ...(record.result ? { result: { ...record.result, ...(record.result.report ? { report: { ...record.result.report } } : {}) } } : {}),
        ...(record.usage ? { usage: { ...record.usage } } : {}),
        ...(record.cause ? { cause: { ...record.cause } } : {})
    };
    return next;
}

export function pageBackgroundTaskRecords(sorted: BackgroundTaskRecord[], options?: BackgroundTaskPageOptions, defaultLimit = DEFAULT_PAGE_LIMIT): BackgroundTaskPage {
    const anchor = decodeBackgroundTaskCursor(options?.cursor);
    const pageSize = normalizeLimit(options?.limit, defaultLimit);
    const startIndex = anchor ? sorted.findIndex(record => record.startedAt === anchor.startedAt && record.id === anchor.id) : -1;
    const begin = anchor ? startIndex + 1 : 0;
    const effectiveBegin = anchor && startIndex < 0 ? 0 : begin;
    const items = sorted.slice(effectiveBegin, effectiveBegin + pageSize).map(cloneBackgroundTaskRecord);
    const endIndex = effectiveBegin + items.length;
    const hasMore = endIndex < sorted.length;
    const nextCursor = hasMore && items.length ? encodeBackgroundTaskCursor(items[items.length - 1]) : undefined;
    return { items, ...(nextCursor ? { nextCursor } : {}), hasMore };
}

/**
 * Durable cursor-paged history store for background tasks. Production and tests
 * use the registered TypeOrm implementation behind this abstract contract.
 */
@Abstract()
export abstract class BackgroundTaskHistoryStore {
    /**
     * Record the initial state of a task (or an update to it). Idempotent by id:
     * appending an existing id replaces the prior snapshot.
     */
    abstract put(record: BackgroundTaskRecord): Promise<void>;

    abstract get(taskId: string): Promise<BackgroundTaskRecord | undefined>;

    /** Cursor paged snapshot across all sessions, newest first. */
    abstract pageAll(options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage>;

    /** Cursor paged snapshot for one owner session, newest first. */
    abstract pageBySession(sessionId: string, options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage>;

    /**
     * Cursor paged snapshot across a set of owner sessions (e.g. a delegation
     * subtree), newest first. Empty or unknown session ids yield an empty page;
     * duplicate ids are harmless.
     */
    abstract pageBySessions(sessionIds: string[], options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage>;

    /** Batch cancel all tasks that are still running. Returns the ids cancelled. */
    abstract batchCancel(taskIds: string[]): Promise<string[]>;

    /** Subscribe to history snapshots. Returns an unsubscribe function. */
    abstract subscribe(listener: BackgroundTaskHistoryListener): () => void;
}

/** DI token under which the durable history store is registered. */
export const BACKGROUND_TASK_HISTORY_STORE = token<BackgroundTaskHistoryStore>('BACKGROUND_TASK_HISTORY_STORE');

const DEFAULT_PAGE_LIMIT = 50;
const ABSOLUTE_MAX_LIMIT = 500;

function normalizeLimit(limit?: number, defaultLimit = DEFAULT_PAGE_LIMIT): number {
    const fallback = Math.max(1, Math.min(Math.floor(Number(defaultLimit) || DEFAULT_PAGE_LIMIT), ABSOLUTE_MAX_LIMIT));
    const value = Math.floor(Number(limit) || fallback);
    if (value < 1) return fallback;
    return Math.min(value, ABSOLUTE_MAX_LIMIT);
}
