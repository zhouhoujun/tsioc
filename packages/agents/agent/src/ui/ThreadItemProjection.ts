import { token } from '@tsdi/ioc';

export type ThreadItemKind = 'command' | 'tool' | 'plan' | 'turn' | 'file-change';
export type ThreadItemStatus = 'running' | 'success' | 'error' | 'cancelled' | 'pending';

/**
 * v19-B1: canonical host-neutral exchange fields shared by the durable
 * command-exchange envelope and the in-memory thread-item projection.
 * Unifying these removes the field-name / validation drift between the
 * gateway/Fake/RemoteEventBridge assembly paths.
 */
export interface AgentExchangeFields {
    kind: string;
    key: string;
    sessionId?: string;
    content: string;
    status?: string;
    sequence?: number;
    attempt?: number;
    durationMs?: number;
    toolCallId?: string;
    command?: string;
    args?: string;
    outputIds?: string[];
    error?: string;
    retryable?: boolean;
    source?: 'local' | 'remote' | 'replay';
}

/** Host-neutral transcript event consumed by browser and TUI projections. */
export interface ThreadItemEvent extends AgentExchangeFields {
    kind: ThreadItemKind;
    status?: ThreadItemStatus;
    receiptId?: string;
}

export interface ThreadItemProjectionPort {
    project(event: ThreadItemEvent): void;
}

export const THREAD_ITEM_PROJECTION = token<ThreadItemProjectionPort>('THREAD_ITEM_PROJECTION');

export function threadItemKey(kind: ThreadItemKind, identity: string): string {
    const value = String(identity || '').trim();
    return value ? `${kind}:${value}` : '';
}

/**
 * v19-C1: unified cross-platform display budget for thread-item transcripts.
 * Browser (ConsoleRenderer) and TUI (TuiRenderer) share the same collapse
 * constants so the two surfaces fold auxiliary content identically.
 */
export const THREAD_ITEM_PREVIEW_LINES = {
    /** auxiliary tool/event/file-change/system/error content (fold with tail preserved) */
    auxiliary: 8,
    /** reasoning content (fold without tail) */
    reasoning: 4,
    /** trailing question lines kept visible when a question tail is present */
    questionTailVisible: 6
} as const;

/** v19-B1: shared normalization reused by command-exchange and thread-item. */
export function normalizeAgentExchangeFields<T extends AgentExchangeFields>(event: T): T {
    return {
        ...event,
        key: String(event.key || '').trim(),
        content: String(event.content || '').trim(),
        sessionId: event.sessionId ? String(event.sessionId).trim() : undefined,
        sequence: Number.isFinite(event.sequence) ? event.sequence : undefined,
        attempt: Number.isFinite(event.attempt) ? event.attempt : undefined,
        outputIds: event.outputIds?.slice()
    } as T;
}

export function normalizeThreadItemEvent(event: ThreadItemEvent): ThreadItemEvent {
    return normalizeAgentExchangeFields(event);
}
