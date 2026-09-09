import { Abstract, Injectable, token } from '@tsdi/ioc';

/**
 * P235 — Single persistent Timeline projection.
 *
 * The agent runtime emits many raw events (tool_invoked/completed/failed/skipped,
 * plan_created/step_started/step_blocked/step_completed/plan_completed, turn_*).
 * For a readable transcript, the UI aggregates them into ONE row per logical unit
 * (a tool call, a plan step, a plan, a turn) keyed by
 * turnId/planId/stepId/toolCallId/receiptId/attempt. This module holds the pure,
 * deterministic, replayable model + reducer + a durable store contract.
 *
 * Two layers, kept deliberately separate:
 *  - Raw `TimelineEventRecord`s are the durable primitive (write-once append-only).
 *  - Projected `TimelineEntry`s are DERIVED from raw events by `reduceTimelineEvents`
 *    (or maintained incrementally with `applyTimelineEvent`). raw/export keeps the
 *    full raw events; display reads the projection. Same toolCall always becomes a
 *    single row because the reducer merges by stable key.
 *
 * Everything here is pure (no node API, no I/O) so the same code can live on the
 * agent server and in the cross-platform agent-ui without environment leaks.
 */

export type TimelineEventType =
    | 'tool_invoked'
    | 'tool_completed'
    | 'tool_failed'
    | 'tool_skipped'
    | 'plan_created'
    | 'step_started'
    | 'step_blocked'
    | 'step_completed'
    | 'plan_completed'
    | 'turn_started'
    | 'turn_completed'
    | 'turn_cancelled';

/**
 * A single raw timeline event, normalized for storage and transport. Each event is
 * append-only and carries a per-session monotonic `seq` + a stable `id` used for
 * cursor paging and dedup/reconnect detection.
 */
export interface TimelineEventRecord {
    /** Per-session monotonic sequence assigned at append time (0-based). */
    seq: number;
    /** Stable unique event id (e.g. receiptId/uuid) for cursor encode + dedup. */
    id: string;
    type: TimelineEventType;
    sessionId: string;
    timestamp: number;
    turnId?: string;
    planId?: string;
    stepId?: string;
    toolCallId?: string;
    receiptId?: string;
    attempt?: number;
    toolName?: string;
    /** Raw status word carried by the event (running/success/error/skipped/completed/...). */
    status?: string;
    /** Agent event sequence for plan events (used for out-of-order/stale detection). */
    sequence?: number;
    /** Human readable one-line summary (input/output/step content). */
    summary?: string;
    /** Extended detail (error message, step content). */
    detail?: string;
    durationMs?: number;
}

export type TimelineEntryKind = 'tool' | 'step' | 'plan' | 'turn';

export type TimelineEntryStatus =
    | 'running'
    | 'success'
    | 'failed'
    | 'skipped'
    | 'blocked'
    | 'cancelled'
    | 'completed'
    | 'pending';

/**
 * A projected, aggregated timeline row. Multiple raw events for the same logical
 * unit merge into a single entry via the reducer. `lastSeq` records the newest raw
 * seq applied so stale/duplicate live events can be rejected.
 */
export interface TimelineEntry {
    /** Stable aggregation key (tool:<toolCallId|receiptId|toolName>, plan:<p>:step:<s>, plan:<p>, turn:<t>). */
    key: string;
    kind: TimelineEntryKind;
    sessionId: string;
    turnId?: string;
    planId?: string;
    stepId?: string;
    toolCallId?: string;
    receiptId?: string;
    attempt?: number;
    /** Display label: tool name / step content / plan id / turn id. */
    label: string;
    status: TimelineEntryStatus;
    startedAt?: number;
    endedAt?: number;
    durationMs?: number;
    /** Newest raw event seq applied to this entry (for stale/duplicate detection). */
    lastSeq: number;
    /** Latest output/input summary. */
    summary?: string;
    error?: string;
    detail?: string;
    /** Latest agent event sequence (for plan events). */
    sequence?: number;
    /** Internal sort key (sequence order). */
    timestampOrderKey?: number;
}

export interface TimelinePageOptions {
    cursor?: string;
    limit?: number;
}

export interface TimelineNoncePage {
    entries: TimelineEntry[];
    nextCursor?: string;
    hasMore: boolean;
}

/* ------------------------------------------------------------------ *
 * Aggregation key helpers
 * ------------------------------------------------------------------ */

export function toolEntryKey(toolName: string, toolCallId?: string, receiptId?: string): string {
    const tokenKey = toolCallId || receiptId;
    return tokenKey ? `tool:${tokenKey}` : `tool:${toolName}`;
}

export function stepEntryKey(planId: string, stepId: string): string {
    return `plan:${planId}:step:${stepId}`;
}

export function planEntryKey(planId: string): string {
    return `plan:${planId}`;
}

export function turnEntryKey(turnId: string): string {
    return `turn:${turnId}`;
}

function labelFor(event: TimelineEventRecord): string {
    if (event.toolName) return event.toolName;
    if (event.stepId) return event.detail || event.stepId;
    if (event.planId) return event.type === 'plan_created' ? (event.detail || event.planId) : event.planId;
    if (event.turnId) return event.detail || event.turnId;
    return event.type;
}

function baseEntryFor(event: TimelineEventRecord, kind: TimelineEntryKind, key: string, status: TimelineEntryStatus): TimelineEntry {
    return {
        key,
        kind,
        sessionId: event.sessionId,
        turnId: event.turnId,
        planId: event.planId,
        stepId: event.stepId,
        toolCallId: event.toolCallId,
        receiptId: event.receiptId,
        attempt: event.attempt,
        label: labelFor(event),
        status,
        startedAt: event.timestamp,
        lastSeq: event.seq,
        summary: event.summary,
        detail: event.detail,
        error: event.type === 'tool_failed' ? event.detail : undefined,
        durationMs: event.durationMs,
        sequence: event.sequence
    };
}

/**
 * Apply a single raw event to an existing entry (in place) — the merge used for
 * incremental updates. Returns `false` if the event is stale (older seq) or does
 * not target the entry; `true` if applied.
 */
export function mergeTimelineEvent(entry: TimelineEntry, event: TimelineEventRecord): boolean {
    if (event.seq < entry.lastSeq) {
        return false;
    }
    if (event.seq > entry.lastSeq) {
        entry.lastSeq = event.seq;
    }
    if (event.sequence !== undefined) {
        entry.sequence = event.sequence;
    }
    entry.timestampOrderKey = event.seq;
    if (event.toolName || event.stepId || event.planId || event.turnId) {
        entry.label = labelFor(event);
    }
    if (event.durationMs !== undefined) {
        entry.durationMs = event.durationMs;
    }
    switch (event.type) {
        case 'tool_invoked':
        case 'step_started':
        case 'turn_started':
            entry.status = 'running';
            entry.startedAt = entry.startedAt ?? event.timestamp;
            if (event.summary) entry.summary = event.summary;
            break;
        case 'tool_completed':
        case 'step_completed':
            entry.status = event.status === 'failed' || event.status === 'cancelled' ? event.status : event.type === 'step_completed' ? (event.status as TimelineEntryStatus) || 'completed' : 'success';
            entry.endedAt = event.timestamp;
            if (event.summary) entry.summary = event.summary;
            if (event.detail) entry.detail = event.detail;
            break;
        case 'tool_failed':
            entry.status = 'failed';
            entry.endedAt = event.timestamp;
            entry.error = event.detail || entry.error;
            break;
        case 'tool_skipped':
            entry.status = 'skipped';
            entry.endedAt = event.timestamp;
            break;
        case 'step_blocked':
            entry.status = 'blocked';
            entry.error = event.detail || entry.error;
            entry.detail = event.detail || entry.detail;
            break;
        case 'plan_created':
            entry.status = entry.status === 'completed' ? entry.status : 'pending';
            if (event.summary) entry.summary = event.summary;
            break;
        case 'plan_completed':
            entry.status = 'completed';
            entry.endedAt = event.timestamp;
            break;
        case 'turn_completed':
            entry.status = 'completed';
            entry.endedAt = event.timestamp;
            break;
        case 'turn_cancelled':
            entry.status = 'cancelled';
            entry.endedAt = event.timestamp;
            break;
        default:
            break;
    }
    return true;
}

/**
 * Apply a raw event to a projection map (in place): creates the row on first event,
 * otherwise merges into the existing row. Returns the affected key, or `null` when
 * the event carries no aggregable identity.
 */
export function applyTimelineEvent(entries: Map<string, TimelineEntry>, event: TimelineEventRecord): string | null {
    let key: string | undefined;
    let kind: TimelineEntryKind;
    let status: TimelineEntryStatus;

    switch (event.type) {
        case 'tool_invoked':
            key = toolEntryKey(event.toolName || '', event.toolCallId, event.receiptId);
            kind = 'tool';
            status = 'running';
            break;
        case 'tool_completed':
            key = toolEntryKey(event.toolName || '', event.toolCallId, event.receiptId);
            kind = 'tool';
            status = 'success';
            break;
        case 'tool_failed':
            key = toolEntryKey(event.toolName || '', event.toolCallId, event.receiptId);
            kind = 'tool';
            status = 'failed';
            break;
        case 'tool_skipped':
            key = toolEntryKey(event.toolName || '', event.toolCallId, event.receiptId);
            kind = 'tool';
            status = 'skipped';
            break;
        case 'step_started':
        case 'step_blocked':
        case 'step_completed':
            if (!event.planId || !event.stepId) return null;
            key = stepEntryKey(event.planId, event.stepId);
            kind = 'step';
            status = event.type === 'step_started' ? 'running' : event.type === 'step_blocked' ? 'blocked' : (event.status as TimelineEntryStatus) || 'completed';
            break;
        case 'plan_created':
            if (!event.planId) return null;
            key = planEntryKey(event.planId);
            kind = 'plan';
            status = 'pending';
            break;
        case 'plan_completed':
            if (!event.planId) return null;
            key = planEntryKey(event.planId);
            kind = 'plan';
            status = 'completed';
            break;
        case 'turn_started':
        case 'turn_completed':
        case 'turn_cancelled':
            if (!event.turnId) return null;
            key = turnEntryKey(event.turnId);
            kind = 'turn';
            status = event.type === 'turn_started' ? 'running' : event.type === 'turn_cancelled' ? 'cancelled' : 'completed';
            break;
        default:
            return null;
    }

    const existing = entries.get(key);
    if (existing) {
        mergeTimelineEvent(existing, event);
    } else {
        entries.set(key, baseEntryFor(event, kind, key, status));
    }
    return key;
}

/**
 * Reduce a list of raw events into a projection map. Deterministic and replayable:
 * the same event list always yields the same entries regardless of call timing.
 */
export function reduceTimelineEvents(events: TimelineEventRecord[]): Map<string, TimelineEntry> {
    const entries = new Map<string, TimelineEntry>();
    const ordered = events.slice().sort(compareTimelineEventsAsc);
    for (const event of ordered) {
        applyTimelineEvent(entries, event);
    }
    return entries;
}

/** Stable display ordering: by first-applied seq (startedAt then key). */
export function sortTimelineEntries(entries: Iterable<TimelineEntry>): TimelineEntry[] {
    return Array.from(entries).sort((a, b) => {
        const aKey = a.timestampOrderKey ?? a.startedAt ?? 0;
        const bKey = b.timestampOrderKey ?? b.startedAt ?? 0;
        if (aKey !== bKey) return aKey - bKey;
        return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    });
}

/* ------------------------------------------------------------------ *
 * Cursor encoding (append-only log, ascending sequence)
 * ------------------------------------------------------------------ */

/** Cursor = `${seq.toString(36)}_${id}`. Points at the last event seen; next page returns strictly after it. */
export interface DecodedTimelineCursor {
    seq: number;
    id: string;
}

export function encodeTimelineCursor(event: Pick<TimelineEventRecord, 'seq' | 'id'>): string {
    return `${event.seq.toString(36)}_${event.id}`;
}

export function decodeTimelineCursor(cursor?: string): DecodedTimelineCursor | undefined {
    if (!cursor) return undefined;
    const sep = cursor.indexOf('_');
    if (sep < 0) return undefined;
    const seq = Number.parseInt(cursor.slice(0, sep), 36);
    const id = cursor.slice(sep + 1);
    if (!Number.isFinite(seq) || !id) return undefined;
    return { seq, id };
}

/** Stable ascending ordering used to page the append-only log. */
export function compareTimelineEventsAsc(left: TimelineEventRecord, right: TimelineEventRecord): number {
    if (left.seq !== right.seq) return left.seq - right.seq;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

/**
 * Cursor-page projected entries shared by every TimelineHistoryStore backend
 * (in-memory, TypeOrm, ...). `cursor` points at the last entry seen; the next
 * page starts strictly after it. `limit` is normalized to [1, ABSOLUTE_MAX_LIMIT].
 */
export function pageTimelineEntries(entries: TimelineEntry[], options?: TimelinePageOptions, defaultLimit = DEFAULT_PAGE_LIMIT): TimelineNoncePage {
    const anchor = options?.cursor ? decodeTimelineCursor(options.cursor) : undefined;
    const pageSize = normalizeLimit(options?.limit, defaultLimit);
    const startIndex = anchor ? entries.findIndex(entry => (entry.lastSeq ?? entry.startedAt ?? 0) === anchor.seq) : -1;
    const begin = anchor ? (startIndex >= 0 ? startIndex + 1 : 0) : 0;
    const items = entries.slice(begin, begin + pageSize);
    const endIndex = begin + items.length;
    const hasMore = endIndex < entries.length;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeTimelineCursor({ seq: last.lastSeq, id: last.key }) : undefined;
    return { entries: items, ...(nextCursor ? { nextCursor } : {}), hasMore };
}

/* ------------------------------------------------------------------ *
 * Durable store contract
 * ------------------------------------------------------------------ */

/**
 * Durable, cursor-paged timeline store. Production and tests use the registered
 * TypeOrm implementation; consumers depend only on this abstract contract.
 *
 * The store holds RAW `TimelineEventRecord`s (append-only per session). The
 * projection is derived via `reduceTimelineEvents`/`applyTimelineEvent` on read,
 * so raw/export always has the full fidelity and replay stays deterministic.
 */
@Abstract()
export abstract class TimelineHistoryStore {
    /** Append one raw event, assigning the per-session monotonic seq. Idempotent by event id. */
    abstract append(event: Omit<TimelineEventRecord, 'seq'>): Promise<TimelineEventRecord>;

    /** All raw events for a session, ascending by seq. */
    abstract get(sessionId: string): Promise<TimelineEventRecord[]>;

    /** Raw events strictly after a seq (last-seen replay), ascending. */
    abstract replay(sessionId: string, sinceSeq?: number): Promise<TimelineEventRecord[]>;

    /** Cursor-paged projected entries for a session. */
    abstract query(sessionId: string, options?: TimelinePageOptions): Promise<TimelineNoncePage>;
}

/** DI token under which the durable timeline store is registered. */
export const TIMELINE_HISTORY_STORE = token<TimelineHistoryStore>('TIMELINE_HISTORY_STORE');

const DEFAULT_PAGE_LIMIT = 100;
const ABSOLUTE_MAX_LIMIT = 500;

function normalizeLimit(limit?: number, defaultLimit = DEFAULT_PAGE_LIMIT): number {
    const fallback = Math.max(1, Math.min(Math.floor(Number(defaultLimit) || DEFAULT_PAGE_LIMIT), ABSOLUTE_MAX_LIMIT));
    const value = Math.floor(Number(limit) || fallback);
    if (value < 1) return fallback;
    return Math.min(value, ABSOLUTE_MAX_LIMIT);
}

/* ------------------------------------------------------------------ *
 * Command exchange durable store (P284)
 * ------------------------------------------------------------------ */

/**
 * Durable record for a single command exchange envelope, stored append-only
 * per session. `seq` is assigned by the store at append time and provides
 * monotonic ordering for cursor paging and replay.
 */
export interface CommandExchangeRecord {
    seq: number;
    id: string;
    sessionId: string;
    sessionEpoch: number;
    kind: string;
    key: string;
    content: string;
    sequence: number;
    attempt?: number;
    receipt?: string;
    requestId?: string;
    status?: string;
    durationMs?: number;
    toolCallId?: string;
    command?: string;
    args?: string;
    outputIds?: string[];
    error?: string;
    retryable?: boolean;
    source?: string;
    timestamp: number;
}

export interface CommandExchangePageOptions {
    cursor?: string;
    sinceSeq?: number;
    limit?: number;
}

export interface CommandExchangeNoncePage {
    records: CommandExchangeRecord[];
    nextCursor?: string;
    hasMore: boolean;
}

/** Encode a cursor pointing at the last record seen for command exchange paging. */
export function encodeCommandExchangeCursor(record: Pick<CommandExchangeRecord, 'seq' | 'id'>): string {
    return `${record.seq.toString(36)}_${record.id}`;
}

/** Decode a command exchange cursor. */
export function decodeCommandExchangeCursor(cursor?: string): { seq: number; id: string } | undefined {
    if (!cursor) return undefined;
    const sep = cursor.indexOf('_');
    if (sep < 0) return undefined;
    const seq = Number.parseInt(cursor.slice(0, sep), 36);
    const id = cursor.slice(sep + 1);
    if (!Number.isFinite(seq) || !id) return undefined;
    return { seq, id };
}

/** Stable ascending ordering for command exchange records. */
export function compareCommandExchangeAsc(left: CommandExchangeRecord, right: CommandExchangeRecord): number {
    if (left.seq !== right.seq) return left.seq - right.seq;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

/**
 * Durable command exchange store. Holds RAW `CommandExchangeRecord`s
 * (append-only per session). Replay and cursor paging are the primary
 * read paths; the UI uses stable key idempotent replay to rebuild state
 * after disconnect.
 */
@Abstract()
export abstract class CommandExchangeStore {
    /** Append one record, assigning the per-session monotonic seq. Idempotent by record id. */
    abstract append(record: Omit<CommandExchangeRecord, 'seq'>): Promise<CommandExchangeRecord>;

    /** All records for a session, ascending by seq. */
    abstract get(sessionId: string): Promise<CommandExchangeRecord[]>;

    /** Records strictly after a seq (for replay since last seen). */
    abstract replay(sessionId: string, sinceSeq?: number): Promise<CommandExchangeRecord[]>;

    /** Cursor-paged records for a session, with optional sinceSeq filter. */
    abstract query(sessionId: string, options?: CommandExchangePageOptions): Promise<CommandExchangeNoncePage>;

    /** Remove all records for a session at or before a given seq (cleanup / retention). */
    abstract cleanup(sessionId: string, beforeSeq: number): Promise<number>;
}

/** DI token for the durable command exchange store. */
export const COMMAND_EXCHANGE_STORE = token<CommandExchangeStore>('COMMAND_EXCHANGE_STORE');

/**
 * Thrown by CommandExchangeStore.append when the incoming record's
 * sessionEpoch is older than the store's highest epoch for that session.
 * The store counts it as a stale exchange and the gateway maps it to a
 * typed RPC/REST error so clients can distinguish stale appends from
 * duplicates.
 */
export class CommandExchangeStaleError extends Error {
    constructor(
        public readonly sessionId: string,
        public readonly sessionEpoch: number,
        public readonly maxEpoch: number
    ) {
        super(`command exchange append rejected: sessionEpoch ${sessionEpoch} < stored max ${maxEpoch} for session '${sessionId}'`);
        this.name = 'CommandExchangeStaleError';
    }
}

/**
 * Page command exchange records with cursor or sinceSeq dual-mode.
 * Shared by all CommandExchangeStore backends.
 */
export function pageCommandExchangeRecords(records: CommandExchangeRecord[], options?: CommandExchangePageOptions): CommandExchangeNoncePage {
    const pageSize = normalizeLimit(options?.limit);
    let filtered = records;

    if (typeof options?.sinceSeq === 'number' && Number.isFinite(options.sinceSeq)) {
        const from = options.sinceSeq + 1;
        filtered = records.filter(r => r.seq >= from);
    }

    const anchor = options?.cursor ? decodeCommandExchangeCursor(options.cursor) : undefined;
    const startIndex = anchor ? filtered.findIndex(r => r.seq === anchor.seq && r.id === anchor.id) : -1;
    const begin = anchor ? (startIndex >= 0 ? startIndex + 1 : 0) : 0;
    const items = filtered.slice(begin, begin + pageSize);
    const endIndex = begin + items.length;
    const hasMore = endIndex < filtered.length;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last ? encodeCommandExchangeCursor({ seq: last.seq, id: last.id }) : undefined;
    return { records: items, ...(nextCursor ? { nextCursor } : {}), hasMore };
}
