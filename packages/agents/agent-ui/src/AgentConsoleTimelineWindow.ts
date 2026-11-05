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
import { formatAgentUiTime, type AgentUiTranslator } from './agent-ui.i18n';
import { fillCommonTemplate, getDisplayWidth, sliceByDisplayWidth, truncateByDisplayWidth } from './AgentConsoleTextWidth';

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
    /** Turn group key (uiEventKey scope prefix, read-only derived, P290). Empty when ungrouped. */
    groupKey?: string;
    /** Turn group nesting depth (1 = inside a group, read-only derived, P290). */
    depth?: number;
}

export interface TimelineWindowLedgerOptions {
    messages: TimelineWindowMessage[];
    limit: number;
    mode: TimelineWindowMode;
    activeScope: string;
    /** Natural-wording override for the hidden-summary line (P288). Default zh. */
    summaryLabels?: AgentConsoleTimelineLabels;
    /** Session-context first row (P291); always kept as items[0] regardless of mode. */
    header?: TimelineWindowMessage;
    /** Session-context last row (P291); always kept as items[items.length - 1]. */
    footer?: TimelineWindowMessage;
    /** Turn collapse state (P290): groupKey -> collapsed. Session-scoped, never persisted. */
    collapsedTurns?: Record<string, boolean>;
}

export interface TimelineWindowLedgerResult {
    items: TimelineWindowItem[];
    summary?: TimelineWindowItem;
    hiddenCount: number;
}

export { AgentConsoleTimelineLabels, DEFAULT_TIMELINE_LABELS, EN_TIMELINE_LABELS } from './AgentConsoleTimelineLabels';
import { AgentConsoleTimelineLabels, DEFAULT_TIMELINE_LABELS } from './AgentConsoleTimelineLabels';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STRUCTURAL_KINDS = new Set(['plan-todo', 'file-change', 'timeline-boundary']);

export function isStructural(metadata?: Record<string, any>): boolean {
    return STRUCTURAL_KINDS.has(metadata?.uiKind);
}

export function isCurrentScope(message: TimelineWindowMessage, scope: string): boolean {
    return scope !== '' && String(message.metadata?.uiEventKey || '').startsWith(`${scope}:`);
}

export function isError(metadata?: Record<string, any>): boolean {
    return metadata?.status === 'error' || metadata?.status === 'failed';
}

/** Estimate how many display rows a message will occupy. */
export function estimateRows(message: TimelineWindowMessage): number {
    const content = String(message.content || '');
    // Structural items (plan-todo, file-change) are multi-line
    if (message.metadata?.uiKind === 'plan-todo') return 3;
    if (message.metadata?.uiKind === 'file-change') return 2;
    if (message.metadata?.uiKind === 'timeline-boundary') return 1;
    // A summary line is 1 row
    if (message.metadata?.uiEventType === 'timeline_summary') return 1;
    // Rough heuristic: 1 row per ~80 display columns (CJK/emoji double-width aware)
    return Math.max(1, Math.ceil(getDisplayWidth(content) / 80));
}

export function classifyItem(
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

export function fillTimelineLabel(template: string | undefined, vars: Record<string, string | number>): string {
    return fillCommonTemplate(template, vars);
}

/** Max display width (CJK/emoji double-width aware) for the single-line session header/footer row (P291). */
export const TIMELINE_HEADER_FOOTER_MAX_WIDTH = 100;

/** Locale short time, e.g. "14:30" (en-US: "2:30 PM"); aligns with opencode Locale.time. */
export function formatTimelineClockTime(ts: number, translator?: AgentUiTranslator | null): string {
    return formatAgentUiTime(ts, translator, { timeStyle: 'short' });
}

/** Locale duration (aligns with opencode Locale.duration): ms / X.Xs / Xm Ys / Xh Ym / Xd Yh. */
export function formatTimelineSessionDuration(input: number): string {
    if (input < 1000) {
        return `${input}ms`;
    }
    if (input < 60000) {
        return `${(input / 1000).toFixed(1)}s`;
    }
    const totalSeconds = Math.floor(input / 1000);
    if (input < 3600000) {
        return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
    }
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (input < 86400000) {
        return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    }
    const totalHours = Math.floor(totalMinutes / 60);
    return `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`;
}

/** Truncate a single-line session row to a max display width (trailing ellipsis). */
export function truncateTimelineRowText(
    content: string,
    maxWidth = TIMELINE_HEADER_FOOTER_MAX_WIDTH
): string {
    return truncateByDisplayWidth(content, maxWidth);
}

export function withTimelineBounds(
    result: TimelineWindowLedgerResult,
    header?: TimelineWindowMessage,
    footer?: TimelineWindowMessage
): TimelineWindowLedgerResult {
    if (!header && !footer) {
        return result;
    }
    const items = result.items.slice();
    if (header) {
        items.unshift({
            message: header,
            priority: TIMELINE_PRIORITY_STRUCTURAL,
            category: 'structural',
            estimatedRows: 1
        });
    }
    if (footer) {
        items.push({
            message: footer,
            priority: TIMELINE_PRIORITY_STRUCTURAL,
            category: 'structural',
            estimatedRows: 1
        });
    }
    return { ...result, items };
}

/**
 * Group key of a timeline message: the scope prefix of its uiEventKey.
 * Only auto-generated turn scopes (`turn-...`) count as groups; event-type
 * prefixes like `read:`/`tool:` are not group keys (P290).
 *
 * Plan step rows group by their own step key `plan:{planId}:{stepId}` first
 * (they only exist inside a turn; grouping by step keeps every step a single
 * evolving row that indents under the plan). `plan_created`/`plan_completed`
 * carry only `plan:{planId}` (no stepId) and fall back to turn grouping (P292).
 */
export function resolveTimelineGroupKey(message: TimelineWindowMessage): string {
    const key = String(message?.metadata?.uiEventKey || '');
    const planStepKey = resolvePlanStepGroupKey(key);
    if (planStepKey) {
        return planStepKey;
    }
    const sep = key.indexOf(':');
    if (sep <= 0) {
        return '';
    }
    const head = key.slice(0, sep);
    return head.startsWith('turn-') ? head : '';
}

/**
 * Step group key of a turn-prefixed plan event key: `turn-xxx:plan:{planId}:{stepId}`
 * collapses to `plan:{planId}:{stepId}`. Returns '' when no stepId follows the
 * plan id (plan_created/plan_completed keys `plan:{planId}`), so those rows keep
 * the turn group (P292).
 */
function resolvePlanStepGroupKey(uiEventKey: string): string {
    const planIdx = uiEventKey.indexOf(':plan:');
    if (planIdx < 0) {
        return '';
    }
    const parts = uiEventKey.slice(planIdx + 1).split(':'); // plan:{planId}[:{stepId}]
    if (parts.length >= 3 && parts[0] === 'plan' && parts[1] && parts[2]) {
        return `${parts[0]}:${parts[1]}:${parts[2]}`;
    }
    return '';
}

function annotateTurnItems(items: TimelineWindowItem[]): TimelineWindowItem[] {
    return items.map(item => {
        const groupKey = resolveTimelineGroupKey(item.message);
        return { ...item, groupKey: groupKey || '', depth: groupKey ? 1 : 0 };
    });
}

interface TurnGroupStats {
    members: TimelineWindowItem[];
    hasError: boolean;
    hasCancelled: boolean;
    toolCallIds: Set<string>;
    changeCallIds: Set<string>;
    errorCount: number;
    durationMs: number;
}

function makeCollapsedTurnItem(
    groupKey: string,
    index: number,
    stats: TurnGroupStats,
    labels?: AgentConsoleTimelineLabels
): TimelineWindowItem {
    const first = stats.members[0]?.message;
    const outcomeWord = stats.hasCancelled
        ? labels?.collapsedOutcomeCancelled || DEFAULT_TIMELINE_LABELS.collapsedOutcomeCancelled
        : stats.hasError
            ? labels?.collapsedOutcomeFailed || DEFAULT_TIMELINE_LABELS.collapsedOutcomeFailed
            : labels?.collapsedOutcomeDone || DEFAULT_TIMELINE_LABELS.collapsedOutcomeDone;
    const parts: string[] = [
        fillTimelineLabel(labels?.collapsedTurn || DEFAULT_TIMELINE_LABELS.collapsedTurn, { index }),
        outcomeWord,
        fillTimelineLabel(labels?.collapsedTools || DEFAULT_TIMELINE_LABELS.collapsedTools, { tools: stats.toolCallIds.size })
    ];
    if (stats.changeCallIds.size > 0) {
        parts.push(fillTimelineLabel(labels?.collapsedChanges || DEFAULT_TIMELINE_LABELS.collapsedChanges, { changes: stats.changeCallIds.size }));
    }
    if (stats.errorCount > 0) {
        parts.push(fillTimelineLabel(labels?.collapsedErrors || DEFAULT_TIMELINE_LABELS.collapsedErrors, { errors: stats.errorCount }));
    }
    // Prefer the turn-level duration; the per-event sum double-counts tool time.
    const turnEventMs = Number(stats.members.find(m => ['turn_completed', 'turn_cancelled', 'turn_cancel', 'turn_failed'].includes(String(m.message?.metadata?.uiEventType || '')))?.message?.metadata?.durationMs);
    parts.push(formatTimelineSessionDuration(Number.isFinite(turnEventMs) && turnEventMs > 0 ? turnEventMs : stats.durationMs));
    const content = parts.join(' · ');
    return {
        message: {
            id: `__timeline_collapsed_${groupKey}__`,
            role: 'assistant',
            content,
            createdAt: Number((first as AgentMessage)?.createdAt || Date.now()),
            metadata: { uiKind: 'timeline-collapsed', uiEventKey: `${groupKey}:__collapsed__`, status: 'success', label: 'timeline' }
        },
        priority: TIMELINE_PRIORITY_STRUCTURAL,
        category: 'structural',
        estimatedRows: 1,
        groupKey,
        depth: 0
    };
}

export function withTurnCollapse(
    result: TimelineWindowLedgerResult,
    options: TimelineWindowLedgerOptions
): TimelineWindowLedgerResult {
    const collapsedTurns = options.collapsedTurns || {};
    const items = annotateTurnItems(result.items);

    const foldedKeys = new Set<string>();
    Object.keys(collapsedTurns).forEach(key => {
        if (collapsedTurns[key] && key && key !== options.activeScope) {
            foldedKeys.add(key);
        }
    });
    if (!foldedKeys.size) {
        return { ...result, items };
    }

    const groups = new Map<string, TurnGroupStats>();
    const groupOrder: string[] = [];
    items.forEach(item => {
        const key = item.groupKey || '';
        if (!key) return;
        let stats = groups.get(key);
        if (!stats) {
            stats = { members: [], hasError: false, hasCancelled: false, toolCallIds: new Set(), changeCallIds: new Set(), errorCount: 0, durationMs: 0 };
            groups.set(key, stats);
            groupOrder.push(key);
        }
        stats.members.push(item);
        const metadata = item.message?.metadata || {};
        if (isError(metadata)) {
            stats.hasError = true;
            stats.errorCount += 1;
        }
        if (metadata.status === 'cancelled' || metadata.uiEventType === 'turn_cancelled') {
            stats.hasCancelled = true;
        }
        const category = String(metadata.category || '');
        const toolCallId = String(metadata.timeline?.toolCallId || '');
        if (toolCallId) {
            stats.toolCallIds.add(toolCallId);
            if (category === 'edit' || category === 'write') {
                stats.changeCallIds.add(toolCallId);
            }
        } else if (category === 'edit' || category === 'write') {
            stats.changeCallIds.add(`${metadata.uiEventKey || ''}:${item.message?.id || ''}`);
        }
        const duration = Number(metadata.durationMs || 0);
        if (Number.isFinite(duration) && duration >= 0) stats.durationMs += duration;
    });

    // A turn with an error event stays expanded so the failure stays visible
    const safeToFold = new Set<string>();
    groupOrder.forEach(key => {
        const stats = groups.get(key)!;
        if (foldedKeys.has(key) && !stats.hasError) {
            safeToFold.add(key);
        }
    });
    if (!safeToFold.size) {
        return { ...result, items };
    }

    const indexByKey = new Map<string, number>();
    groupOrder.forEach((key, i) => indexByKey.set(key, i + 1));

    const output: TimelineWindowItem[] = [];
    const emitted = new Set<string>();
    items.forEach(item => {
        const key = item.groupKey || '';
        if (key && safeToFold.has(key)) {
            if (emitted.has(key)) {
                return;
            }
            emitted.add(key);
            output.push(makeCollapsedTurnItem(key, indexByKey.get(key) || 0, groups.get(key)!, options.summaryLabels));
            return;
        }
        output.push(item);
    });

    return { ...result, items: output };
}

export function makeSummary(
    hidden: number,
    mode: TimelineWindowMode,
    firstMessage: TimelineWindowMessage,
    labels?: AgentConsoleTimelineLabels
): TimelineWindowItem {
    const template =
        mode === 'compact'
            ? labels?.summaryCompact || DEFAULT_TIMELINE_LABELS.summaryCompact
            : labels?.summarySteps || DEFAULT_TIMELINE_LABELS.summarySteps;
    const content = fillTimelineLabel(template, { hidden });
    return {
        message: {
            id: '__timeline_hidden_summary__',
            role: 'assistant',
            content,
            createdAt: Number((firstMessage as AgentMessage)?.createdAt || Date.now()),
            metadata: { uiKind: 'timeline-collapsed', uiEventType: 'timeline_summary', status: 'success', label: 'timeline' }
        },
        priority: TIMELINE_PRIORITY_ERROR + 1, // Always show summary
        category: 'summary',
        estimatedRows: 1
    };
}

// ── Timeline sentence formatter ──────────────────────────────────────────────

export { formatTimelineSentence, humanizeToolName, resolveTimelineEventSentence } from './AgentConsoleTimelineFormat';
export type { TimelineSentenceParts } from './AgentConsoleTimelineFormat';

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

export { resolveTimelineWindowLedger } from './AgentConsoleTimelineLedger';
