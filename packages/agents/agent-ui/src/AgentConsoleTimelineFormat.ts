import type { AgentConsoleTimelineLabels } from './AgentConsoleTimelineLabels';

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

function resolveEventActionVerb(uiEventType: string, labels?: AgentConsoleTimelineLabels): string {
    switch (uiEventType) {
        case 'turn_started':
        case 'turn_start':
            return labels?.actionGotRequest ?? 'Got your request';
        case 'turn_cancelled':
        case 'turn_cancel':
            return labels?.actionTurnCancelled ?? 'Turn cancelled';
        case 'error':
            return 'Error';
        case 'tool_call':
        case 'tool_invoked':
        case 'tool_running':
            return labels?.actionRunning ?? 'Running';
        case 'tool_succeeded':
        case 'tool_completed':
            return labels?.actionFinished ?? 'Finished';
        case 'tool_failed':
            return labels?.actionFailedToRun ?? 'Failed to run';
        case 'plan_created':
            return labels?.actionCreatedPlan ?? 'Created plan';
        case 'plan_step_started':
        case 'step_started':
            return labels?.actionExecutingStep ?? 'Executing step';
        case 'plan_step_completed':
        case 'step_completed':
            return labels?.actionCompletedStep ?? 'Completed step';
        case 'plan_step_failed':
        case 'step_failed':
            return labels?.actionStepFailed ?? 'Step failed';
        case 'plan_step_blocked':
        case 'step_blocked':
            return labels?.actionStepBlocked ?? 'Step blocked';
        case 'approval':
        case 'approval_request':
            return labels?.actionApprovalRequested ?? 'Approval requested';
        case 'context_prepared':
            return labels?.actionLoadedContext ?? 'Loaded context';
        case 'model_completed':
            return labels?.actionModelResponded ?? 'Model responded';
        case 'background_task_started':
            return labels?.actionBackgroundTaskStarted ?? 'Background task started';
        case 'background_task_completed':
            return labels?.actionBackgroundTaskCompleted ?? 'Background task completed';
        case 'background_task_failed':
            return labels?.actionBackgroundTaskFailed ?? 'Background task failed';
        case 'timeline_summary':
            return '';
        default:
            return labels?.actionCompleted ?? 'Completed';
    }
}

function truncateError(error: string): string {
    return error.length > 80 ? `${error.slice(0, 77)}...` : error;
}

function resolveEventResultPhrase(
    status?: string,
    error?: string,
    _durationMs?: number,
    failureInAction = false
): string {
    const parts: string[] = [];

    if (status === 'failed' || status === 'error') {
        if (error) {
            // failureInAction: the action verb already conveys the failure, keep only the cause.
            parts.push(failureInAction ? truncateError(error) : `failed: ${truncateError(error)}`);
        } else if (!failureInAction) {
            parts.push('failed');
        }
    }

    return parts.join(' ');
}

function resolveFailureOutcome(error?: string, _durationMs?: number): string {
    if (!error) return '';
    return `: ${truncateError(error)}`;
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
    content?: string,
    action?: string,
    status?: string
): string {
    const trimmedLabel = String(label || '').trim();
    const trimmedContent = String(content || '').trim();
    if (uiEventType.startsWith('tool_') || uiEventType === 'tool_call') return trimmedLabel || '';
    if (uiEventType.startsWith('plan_') || uiEventType.startsWith('step_')) return trimmedContent || trimmedLabel || '';
    // P301: label only as target/category — drop it when it repeats the event
    // category, the action verb or the status word (e.g. approval event with
    // label 'approval').
    if (trimmedLabel && isRedundantObjectLabel(uiEventType, trimmedLabel, action, status)) {
        return trimmedContent || '';
    }
    return trimmedLabel || trimmedContent || '';
}

function isRedundantObjectLabel(uiEventType: string, label: string, action?: string, status?: string): boolean {
    const normalized = label.toLowerCase().trim();
    if (!normalized) return false;
    // Label is the bare event category (e.g. 'approval' for approval_request) —
    // language-agnostic, since the action verb already conveys it.
    if (normalized === uiEventType.toLowerCase() || uiEventType.startsWith(`${normalized}_`)) return true;
    const actionWords = new Set(
        String(action || '').toLowerCase().split(/\s+/).filter(word => word.length > 2)
    );
    if (actionWords.has(normalized)) return true;
    const statusWord = String(status || '').toLowerCase().trim();
    return !!statusWord && normalized === statusWord;
}

export function resolveTimelineEventSentence(
    metadata?: Record<string, any>,
    fallbackContent?: string,
    labels?: AgentConsoleTimelineLabels
): string | undefined {
    if (!metadata || metadata.uiKind !== 'event') return undefined;

    const uiEventType = String(metadata.uiEventType || '').trim();
    const status = String(metadata.status || '').trim();
    const label = String(metadata.label || metadata.uiEventLabel || '').trim();
    const content = String(fallbackContent || '').trim();
    const error = String(metadata.error || '').trim();
    const durationMs = Number(metadata.durationMs);

    const action = resolveEventActionVerb(uiEventType, labels);
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
                ? `${action} ${object}${outcome}`
                : `${action}${outcome}`;
        }
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    if (uiEventType.startsWith('plan_') || uiEventType.startsWith('step_')) {
        const object = resolveEventObjectLabel(uiEventType, label, content, action, status);
        if (failed) {
            const outcome = resolveFailureOutcome(error, durationMs);
            return `${action}${object ? ` ${object}` : ''}${outcome}`;
        }
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, object, result });
    }

    if (uiEventType === 'context_prepared' || uiEventType === 'model_completed') {
        const result = resolveEventResultPhrase(status, error, durationMs);
        return formatTimelineSentence({ action, result });
    }

    const object = resolveEventObjectLabel(uiEventType, label, content, action, status);
    const result = resolveEventResultPhrase(status, error, durationMs);
    return formatTimelineSentence({ action, object, result });
}

