/**
 * @file Timeline window ledger — pure-function extraction of
 * `resolveTimelineVisibleMessages` from AgentConsolePanels.
 *
 * Each item is annotated with priority/category/estimatedRows so the
 * window can reserve row budget for structural items and never silently
 * evict history events. Structural items now share the same row budget
 * as transcript events.
 *
 * agent-ui/src/ must NOT import @tsdi/components/console or node APIs.
 */

import type { AgentMessage } from '@tsdi/agent';

// ── Types ────────────────────────────────────────────────────────────────────

export type TimelineWindowMode = 'compact' | 'steps' | 'verbose';

export interface TimelineWindowMessage {
    id?: string;
    role?: string;
    content: string;
    metadata?: Record<string, any>;
    createdAt?: number;
}

/** Priority — higher number wins when budget is tight. */
export const TIMELINE_PRIORITY_ERROR = 40;
export const TIMELINE_PRIORITY_BOUNDARY = 30;
export const TIMELINE_PRIORITY_STRUCTURAL = 25;
export const TIMELINE_PRIORITY_CURRENT_SCOPE = 20;
export const TIMELINE_PRIORITY_TAIL = 10;

/** Category classification for each timeline item. */
export type TimelineItemCategory =
    | 'error'
    | 'boundary'
    | 'structural'
    | 'current-scope'
    | 'tail'
    | 'summary';

export interface TimelineWindowItem {
    message: TimelineWindowMessage;
    priority: number;
    category: TimelineItemCategory;
    /** Estimated row cost (1 = single-line item). */
    estimatedRows: number;
}

export interface TimelineWindowLedgerOptions {
    messages: TimelineWindowMessage[];
    limit: number;
    mode: TimelineWindowMode;
    activeScope: string;
}

export interface TimelineWindowLedgerResult {
    items: TimelineWindowItem[];
    summary?: TimelineWindowItem;
    hiddenCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STRUCTURAL_KINDS = new Set(['plan-todo', 'file-change', 'timeline-boundary']);

function isStructural(metadata?: Record<string, any>): boolean {
    return STRUCTURAL_KINDS.has(metadata?.uiKind);
}

function isCurrentScope(message: TimelineWindowMessage, scope: string): boolean {
    return scope !== '' && String(message.metadata?.uiEventKey || '').startsWith(`${scope}:`);
}

function isError(metadata?: Record<string, any>): boolean {
    return metadata?.status === 'error' || metadata?.status === 'failed';
}

/** Estimate how many display rows a message will occupy. */
function estimateRows(message: TimelineWindowMessage): number {
    const content = String(message.content || '');
    // Structural items (plan-todo, file-change) are multi-line
    if (message.metadata?.uiKind === 'plan-todo') return 3;
    if (message.metadata?.uiKind === 'file-change') return 2;
    if (message.metadata?.uiKind === 'timeline-boundary') return 1;
    // A summary line is 1 row
    if (message.metadata?.uiEventType === 'timeline_summary') return 1;
    // Rough heuristic: 1 row per ~80 chars
    return Math.max(1, Math.ceil(content.length / 80));
}

function classifyItem(
    message: TimelineWindowMessage,
    scope: string,
    isStruct: boolean,
    isErr: boolean,
    isCurrent: boolean
): { priority: number; category: TimelineItemCategory } {
    if (isErr) return { priority: TIMELINE_PRIORITY_ERROR, category: 'error' };
    if (isStruct) {
        if (message.metadata?.uiKind === 'timeline-boundary') {
            return { priority: TIMELINE_PRIORITY_BOUNDARY, category: 'boundary' };
        }
        return { priority: TIMELINE_PRIORITY_STRUCTURAL, category: 'structural' };
    }
    if (isCurrent) return { priority: TIMELINE_PRIORITY_CURRENT_SCOPE, category: 'current-scope' };
    return { priority: TIMELINE_PRIORITY_TAIL, category: 'tail' };
}

function makeSummary(
    hidden: number,
    mode: TimelineWindowMode,
    firstMessage: TimelineWindowMessage
): TimelineWindowItem {
    const content =
        mode === 'compact'
            ? `${hidden} events hidden · compact mode shows active step + errors only`
            : `${hidden} earlier timeline events hidden · press /timeline verbose to view all`;
    return {
        message: {
            id: '__timeline_hidden_summary__',
            role: 'assistant',
            content,
            createdAt: Number((firstMessage as AgentMessage)?.createdAt || Date.now()),
            metadata: { uiKind: 'event', uiEventType: 'timeline_summary', status: 'success', label: 'timeline' }
        },
        priority: TIMELINE_PRIORITY_ERROR + 1, // Always show summary
        category: 'summary',
        estimatedRows: 1
    };
}

// ── Timeline sentence formatter ──────────────────────────────────────────────

export interface TimelineSentenceParts {
    actor?: string;
    action: string;
    object?: string;
    result?: string;
    detail?: string;
}

export function formatTimelineSentence(parts: TimelineSentenceParts): string {
    const { actor, action, object, result, detail } = parts;
    if (!action) return '';

    const segments: string[] = [];
    if (actor) segments.push(actor);
    segments.push(object ? `${action} ${object}` : action);
    if (result) segments.push(result);
    if (detail) segments.push(detail);

    return segments.join(' ').replace(/\b(\w+)\s+\1\b/gi, '$1');
}

// ── Event semantic field extraction ──────────────────────────────────────────

function resolveEventActionVerb(uiEventType: string, status?: string): string {
    const failed = status === 'failed' || status === 'error';
    switch (uiEventType) {
        case 'turn_started':
        case 'turn_start':
            return 'Understanding request';
        case 'turn_cancelled':
        case 'turn_cancel':
            return 'Turn cancelled';
        case 'error':
            return 'Error';
        case 'tool_call':
        case 'tool_invoked':
        case 'tool_running':
            return 'Running';
        case 'tool_succeeded':
        case 'tool_completed':
            return failed ? 'Running' : 'Completed';
        case 'tool_failed':
            return 'Running';
        case 'plan_created':
            return 'Created plan';
        case 'plan_step_started':
        case 'step_started':
            return 'Executing step';
        case 'plan_step_completed':
        case 'step_completed':
            return failed ? 'Step failed' : 'Completed step';
        case 'plan_step_blocked':
        case 'step_blocked':
            return 'Step blocked';
        case 'approval':
        case 'approval_request':
            return 'Approval requested';
        case 'context_prepared':
            return 'Prepared context';
        case 'model_completed':
            return 'Model responded';
        case 'background_task_started':
            return 'Background task started';
        case 'background_task_completed':
            return 'Background task completed';
        case 'background_task_failed':
            return 'Background task failed';
        case 'timeline_summary':
            return '';
        default:
            return 'Completed';
    }
}

function resolveEventResultPhrase(
    status?: string,
    error?: string,
    durationMs?: number
): string {
    const parts: string[] = [];
    const duration = formatEventDuration(durationMs);

    if (status === 'failed' || status === 'error') {
        const msg = error
            ? (error.length > 80 ? `${error.slice(0, 77)}...` : error)
            : 'failed';
        parts.push(error ? `failed: ${msg}` : msg);
    }

    if (duration) parts.push(duration);
    return parts.join(' ');
}

function formatEventDuration(durationMs?: number): string {
    if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) return '';
    if (durationMs < 1000) return `(${Math.round(durationMs)}ms)`;
    const seconds = durationMs / 1000;
    const formatted = seconds >= 10
        ? `${Math.round(seconds)}s`
        : `${seconds.toFixed(1).replace(/\.0$/, '')}s`;
    return `(${formatted})`;
}

function resolveEventObjectLabel(
    uiEventType: string,
    label?: string,
    content?: string
): string {
    const trimmedLabel = String(label || '').trim();
    const trimmedContent = String(content || '').trim();
    if (uiEventType.startsWith('tool_') || uiEventType === 'tool_call') return trimmedLabel || '';
    if (uiEventType.startsWith('plan_') || uiEventType.startsWith('step_')) return trimmedContent || trimmedLabel || '';
    return trimmedLabel || trimmedContent || '';
}

export function resolveTimelineEventSentence(
    metadata?: Record<string, any>,
    fallbackContent?: string
): string | undefined {
    if (!metadata || metadata.uiKind !== 'event') return undefined;

    const uiEventType = String(metadata.uiEventType || '').trim();
    const status = String(metadata.status || '').trim();
    const label = String(metadata.label || metadata.uiEventLabel || '').trim();
    const content = String(fallbackContent || '').trim();
    const error = String(metadata.error || '').trim();
    const durationMs = Number(metadata.durationMs);

    const action = resolveEventActionVerb(uiEventType, status);
    if (!action) return undefined;

    if (uiEventType === 'turn_cancelled' || uiEventType === 'turn_cancel') return action;
    if (uiEventType === 'error') return `Error: ${error || content || 'unknown error'}`;

    if (uiEventType.startsWith('background_task')) {
        const taskId = String(metadata.taskId || '').trim();
        const object = taskId ? `#${taskId}` : '';
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    if (uiEventType.startsWith('tool_') || uiEventType === 'tool_call') {
        const object = resolveEventObjectLabel(uiEventType, label, content);
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    if (uiEventType.startsWith('plan_') || uiEventType.startsWith('step_')) {
        const object = resolveEventObjectLabel(uiEventType, label, content);
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    if (uiEventType === 'context_prepared' || uiEventType === 'model_completed') {
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, result });
    }

    const object = resolveEventObjectLabel(uiEventType, label, content);
    const result = resolveEventResultPhrase(status, error, durationMs);
    return formatTimelineSentence({ action, object, result });
}

// ── Core pure function ───────────────────────────────────────────────────────

/**
 * Resolve which timeline messages fit in the visible window.
 *
 * Structural items (plan-todo, file-change, timeline-boundary) now share the
 * same row budget as transcript events, preventing them from silently evicting
 * history events.
 *
 * Returns a ledger with per-item priority/category/estimatedRows annotations
 * so callers can render hidden-range markers or re-budget as needed.
 */
export function resolveTimelineWindowLedger(
    options: TimelineWindowLedgerOptions
): TimelineWindowLedgerResult {
    const { messages, limit, mode, activeScope } = options;

    if (mode === 'verbose') {
        return {
            items: messages.map(msg => {
                const struct = isStructural(msg.metadata);
                const err = isError(msg.metadata);
                const current = isCurrentScope(msg, activeScope);
                const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
                return { message: msg, priority, category, estimatedRows: estimateRows(msg) };
            }),
            hiddenCount: 0
        };
    }

    if (messages.length <= limit) {
        return {
            items: messages.map(msg => {
                const struct = isStructural(msg.metadata);
                const err = isError(msg.metadata);
                const current = isCurrentScope(msg, activeScope);
                const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
                return { message: msg, priority, category, estimatedRows: estimateRows(msg) };
            }),
            hiddenCount: 0
        };
    }

    const structural = messages.filter(msg => isStructural(msg.metadata));
    const transcript = messages.filter(msg => !isStructural(msg.metadata));

    if (mode === 'compact') {
        const current = activeScope
            ? transcript.filter(msg => isCurrentScope(msg, activeScope))
            : [];
        const errors = transcript.filter(msg => isError(msg.metadata));

        const retained = new Set<string>();
        current.forEach(msg => { if (msg.id) retained.add(msg.id); });
        errors.forEach(msg => { if (msg.id) retained.add(msg.id); });
        const visible = transcript.filter(msg => msg.id != null && retained.has(msg.id));
        const hidden = transcript.length - visible.length;

        const items: TimelineWindowItem[] = [];
        if (hidden > 0) {
            items.push(makeSummary(hidden, mode, messages[0]));
        }
        visible.forEach(msg => {
            const struct = isStructural(msg.metadata);
            const err = isError(msg.metadata);
            const current = isCurrentScope(msg, activeScope);
            const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        });
        structural.forEach(msg => {
            const err = isError(msg.metadata);
            const { priority, category } = classifyItem(msg, activeScope, true, err, false);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        });

        return { items, hiddenCount: hidden };
    }

    // steps mode (default): tail + active scope + structural
    const current = activeScope
        ? transcript.filter(msg => isCurrentScope(msg, activeScope))
        : [];
    const tail = transcript.slice(-limit);
    const retained = new Set(tail.map(msg => msg.id));
    current.forEach(msg => retained.add(msg.id));
    const visible = transcript.filter(msg => retained.has(msg.id));
    const hidden = transcript.length - visible.length;

    const items: TimelineWindowItem[] = [];
    if (hidden > 0) {
        items.push(makeSummary(hidden, mode, messages[0]));
    }
    visible.forEach(msg => {
        const err = isError(msg.metadata);
        const inTail = tail.some(t => t.id === msg.id);
        const inCurrent = current.some(c => c.id === msg.id);
        if (inCurrent) {
            const { priority, category } = classifyItem(msg, activeScope, false, err, true);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        } else if (inTail) {
            const { priority, category } = classifyItem(msg, activeScope, false, err, false);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        }
    });
    structural.forEach(msg => {
        const err = isError(msg.metadata);
        const { priority, category } = classifyItem(msg, activeScope, true, err, false);
        items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
    });

    return { items, hiddenCount: hidden };
}
