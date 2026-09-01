import { token } from '@tsdi/ioc';

export type ThreadItemKind = 'command' | 'tool' | 'plan' | 'turn' | 'file-change';
export type ThreadItemStatus = 'running' | 'success' | 'error' | 'cancelled' | 'pending';

/** Host-neutral transcript event consumed by browser and TUI projections. */
export interface ThreadItemEvent {
    kind: ThreadItemKind;
    key: string;
    sessionId?: string;
    content: string;
    status?: ThreadItemStatus;
    sequence?: number;
    attempt?: number;
    durationMs?: number;
    receiptId?: string;
    toolCallId?: string;
    command?: string;
    args?: string;
    outputIds?: string[];
    error?: string;
    retryable?: boolean;
    source?: 'local' | 'remote' | 'replay';
}

export interface ThreadItemProjectionPort {
    project(event: ThreadItemEvent): void;
}

export const THREAD_ITEM_PROJECTION = token<ThreadItemProjectionPort>('THREAD_ITEM_PROJECTION');

export function threadItemKey(kind: ThreadItemKind, identity: string): string {
    const value = String(identity || '').trim();
    return value ? `${kind}:${value}` : '';
}

export function normalizeThreadItemEvent(event: ThreadItemEvent): ThreadItemEvent {
    return {
        ...event,
        key: String(event.key || '').trim(),
        content: String(event.content || '').trim(),
        sessionId: event.sessionId ? String(event.sessionId).trim() : undefined,
        sequence: Number.isFinite(event.sequence) ? event.sequence : undefined,
        attempt: Number.isFinite(event.attempt) ? event.attempt : undefined,
        outputIds: event.outputIds?.slice()
    };
}
