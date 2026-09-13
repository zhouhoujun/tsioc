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
import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';

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

export interface AgentConsoleTimelineLabels {
    /** Compact-mode summary template; `{hidden}` is the hidden count. */
    summaryCompact?: string;
    /** Steps-mode summary template; `{hidden}` is the hidden count. */
    summarySteps?: string;
    /** Plan-step boundary template; `{index}`, `{total}`, `{content}` placeholders. */
    boundaryStep?: string;
    /** Session-header start-time template (P291); `{time}` is a locale short time. */
    headerStart?: string;
    /** Session-header current-step template (P291); `{index}`, `{total}` placeholders. */
    headerStep?: string;
    /** Session-header error-count template (P291); `{count}` placeholder. */
    headerErrors?: string;
    /** Session-footer terminal state word when the session completed (P291). */
    footerDone?: string;
    /** Session-footer terminal state word when the session errored (P291). */
    footerFailed?: string;
    /** Session-footer terminal state word while the session is running (P291). */
    footerRunning?: string;
    /** Session-footer duration template (P291); `{duration}` placeholder. */
    footerDuration?: string;
    /** Session-footer mode-hint template (P291); `{mode}` is a /timeline subcommand. */
    footerMode?: string;
    /** Collapsed-turn summary template (P290); `{index}`, `{tools}`, `{duration}` placeholders. */
    collapsedTurn?: string;
}

/** zh 默认（对齐 messageStatusLabels 模式，P288）。 */
export const DEFAULT_TIMELINE_LABELS: Required<AgentConsoleTimelineLabels> = {
    summaryCompact: '已隐藏 {hidden} 条事件 · 紧凑模式仅显示当前步骤与错误',
    summarySteps: '已隐藏 {hidden} 条早期事件',
    boundaryStep: '第 {index}/{total} 步 · {content}',
    headerStart: '开始 {time}',
    headerStep: 'step {index}/{total}',
    headerErrors: '{count} 个错误',
    footerDone: '完成',
    footerFailed: '失败',
    footerRunning: '进行中',
    footerDuration: '耗时 {duration}',
    footerMode: '/timeline {mode}',
    collapsedTurn: '第 {index} 轮 · {tools} 个工具 · {duration}',
};

export const EN_TIMELINE_LABELS: Required<AgentConsoleTimelineLabels> = {
    summaryCompact: '{hidden} events hidden · compact shows active step + errors only',
    summarySteps: '{hidden} earlier timeline events hidden',
    boundaryStep: 'Step {index} of {total} · {content}',
    headerStart: 'started {time}',
    headerStep: 'step {index}/{total}',
    headerErrors: '{count} error(s)',
    footerDone: 'Done',
    footerFailed: 'Failed',
    footerRunning: 'In progress',
    footerDuration: 'took {duration}',
    footerMode: '/timeline {mode}',
    collapsedTurn: 'turn {index} · {tools} tool calls · {duration}',
};

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
    // Rough heuristic: 1 row per ~80 display columns (CJK/emoji double-width aware)
    return Math.max(1, Math.ceil(getDisplayWidth(content) / 80));
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

export function fillTimelineLabel(template: string | undefined, vars: Record<string, string | number>): string {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key: string) =>
        key in vars ? String(vars[key]) : `{${key}}`
    );
}

/** Max display width (CJK/emoji double-width aware) for the single-line session header/footer row (P291). */
export const TIMELINE_HEADER_FOOTER_MAX_WIDTH = 100;

/** Locale short time, e.g. "14:30" (en-US: "2:30 PM"); aligns with opencode Locale.time. */
export function formatTimelineClockTime(ts: number): string {
    return new Date(ts).toLocaleTimeString(undefined, { timeStyle: 'short' });
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
    const text = String(content || '');
    if (getDisplayWidth(text) <= maxWidth) {
        return text;
    }
    return `${sliceByDisplayWidth(text, maxWidth).replace(/\s+$/, '')}…`;
}

function withTimelineBounds(
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
    toolCallIds: Set<string>;
    durationMs: number;
}

function makeCollapsedTurnItem(
    groupKey: string,
    index: number,
    stats: TurnGroupStats,
    labels?: AgentConsoleTimelineLabels
): TimelineWindowItem {
    const first = stats.members[0]?.message;
    const content = fillTimelineLabel(labels?.collapsedTurn || DEFAULT_TIMELINE_LABELS.collapsedTurn, {
        index,
        tools: stats.toolCallIds.size,
        duration: formatTimelineSessionDuration(stats.durationMs)
    });
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

function withTurnCollapse(
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
        if (!key) {
            return;
        }
        let stats = groups.get(key);
        if (!stats) {
            stats = { members: [], hasError: false, toolCallIds: new Set(), durationMs: 0 };
            groups.set(key, stats);
            groupOrder.push(key);
        }
        stats.members.push(item);
        if (isError(item.message?.metadata)) {
            stats.hasError = true;
        }
        const toolCallId = String(item.message?.metadata?.timeline?.toolCallId || '');
        if (toolCallId) {
            stats.toolCallIds.add(toolCallId);
        }
        const duration = Number(item.message?.metadata?.durationMs || 0);
        if (Number.isFinite(duration) && duration >= 0) {
            stats.durationMs += duration;
        }
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

function makeSummary(
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

// ── Tool name humanization ───────────────────────────────────────────────────

const TOOL_NAME_ACRONYMS = new Set([
    'api', 'cli', 'css', 'db', 'html', 'http', 'https', 'id',
    'json', 'rpc', 'sql', 'ssh', 'sse', 'ts', 'url', 'uuid', 'xml', 'yaml'
]);

export function humanizeToolName(name: string | null | undefined): string {
    const raw = String(name || '').trim();
    if (!raw) return '';

    const words = raw
        // camelCase/PascalCase boundary → separate tokens
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        // acronym boundary (HTTPRequest → HTTP Request)
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]/)
        .filter(word => word.length > 0);

    return words
        .map(word => {
            const lower = word.toLowerCase();
            return TOOL_NAME_ACRONYMS.has(lower) ? lower.toUpperCase() : lower;
        })
        .join(' ');
}

// ── Event semantic field extraction ──────────────────────────────────────────

function resolveEventActionVerb(uiEventType: string): string {
    switch (uiEventType) {
        case 'turn_started':
        case 'turn_start':
            return 'Got your request';
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
            return 'Finished';
        case 'tool_failed':
            return 'Failed to run';
        case 'plan_created':
            return 'Created plan';
        case 'plan_step_started':
        case 'step_started':
            return 'Executing step';
        case 'plan_step_completed':
        case 'step_completed':
            return 'Completed step';
        case 'plan_step_failed':
        case 'step_failed':
            return 'Step failed';
        case 'plan_step_blocked':
        case 'step_blocked':
            return 'Step blocked';
        case 'approval':
        case 'approval_request':
            return 'Approval requested';
        case 'context_prepared':
            return 'Loaded context';
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

function truncateError(error: string): string {
    return error.length > 80 ? `${error.slice(0, 77)}...` : error;
}

function resolveEventResultPhrase(
    status?: string,
    error?: string,
    durationMs?: number,
    failureInAction = false
): string {
    const parts: string[] = [];
    const duration = formatEventDuration(durationMs);

    if (status === 'failed' || status === 'error') {
        if (error) {
            // failureInAction: the action verb already conveys the failure, keep only the cause.
            parts.push(failureInAction ? truncateError(error) : `failed: ${truncateError(error)}`);
        } else if (!failureInAction) {
            parts.push('failed');
        }
    }

    if (duration) parts.push(duration);
    return parts.join(' ');
}

function resolveFailureOutcome(error?: string, durationMs?: number): string {
    const parts: string[] = [];
    if (error) parts.push(`: ${truncateError(error)}`);
    const duration = formatEventDuration(durationMs);
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

    const action = resolveEventActionVerb(uiEventType);
    if (!action) return undefined;

    if (uiEventType === 'turn_cancelled' || uiEventType === 'turn_cancel') return action;
    if (uiEventType === 'error') return `Error: ${error || content || 'unknown error'}`;

    if (uiEventType.startsWith('background_task')) {
        const taskId = String(metadata.taskId || '').trim();
        const object = taskId ? `#${taskId}` : '';
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    const failed = status === 'failed' || status === 'error';

    if (uiEventType.startsWith('tool_') || uiEventType === 'tool_call') {
        const object = humanizeToolName(resolveEventObjectLabel(uiEventType, label, content));
        if (failed) {
            const outcome = resolveFailureOutcome(error, durationMs);
            return object
                ? `Failed to run ${object}${outcome}`
                : `Failed to run${outcome}`;
        }
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    if (uiEventType.startsWith('plan_') || uiEventType.startsWith('step_')) {
        const object = resolveEventObjectLabel(uiEventType, label, content);
        if (failed) {
            const outcome = resolveFailureOutcome(error, durationMs);
            return `Step failed${object ? ` ${object}` : ''}${outcome}`;
        }
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
    const { messages, limit, mode, activeScope, header, footer } = options;

    if (mode === 'verbose') {
        return withTurnCollapse(withTimelineBounds({
            items: messages.map(msg => {
                const struct = isStructural(msg.metadata);
                const err = isError(msg.metadata);
                const current = isCurrentScope(msg, activeScope);
                const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
                return { message: msg, priority, category, estimatedRows: estimateRows(msg) };
            }),
            hiddenCount: 0
        }, header, footer), options);
    }

    if (messages.length <= limit) {
        return withTurnCollapse(withTimelineBounds({
            items: messages.map(msg => {
                const struct = isStructural(msg.metadata);
                const err = isError(msg.metadata);
                const current = isCurrentScope(msg, activeScope);
                const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
                return { message: msg, priority, category, estimatedRows: estimateRows(msg) };
            }),
            hiddenCount: 0
        }, header, footer), options);
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
            items.push(makeSummary(hidden, mode, messages[0], options.summaryLabels));
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

        return withTurnCollapse(withTimelineBounds({ items, hiddenCount: hidden }, header, footer), options);
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
        items.push(makeSummary(hidden, mode, messages[0], options.summaryLabels));
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

    return withTurnCollapse(withTimelineBounds({ items, hiddenCount: hidden }, header, footer), options);
}
