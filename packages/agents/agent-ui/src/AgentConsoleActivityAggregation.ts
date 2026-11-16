import type { AgentMessage } from '@tsdi/agent';
import { presentAgentConsoleSessionContent } from './AgentConsoleSessionContentPresenter';

export type AgentConsoleActivityVerbosity = 'low' | 'medium' | 'high';

export interface AgentConsoleActivityStep {
    id: string;
    label: string;
    summary: string;
    durationMs?: number;
}

export interface AgentConsoleActivityAggregationOptions {
    verbosity: AgentConsoleActivityVerbosity;
    /** Inline expansion state keyed by the synthetic activity id. */
    isExpanded: (messageId: string) => boolean;
    /** i18n for `{count} steps`; the fallback keeps hosts without a translator readable. */
    formatSteps: (count: number) => string;
}

const EXECUTION_KINDS = new Set(['tool', 'command', 'event']);
/** `low` also folds settled reasoning into the activity run. */
const LOW_VERBOSITY_KINDS = new Set(['tool', 'command', 'event', 'thought']);

function isTerminalStep(message: AgentMessage): boolean {
    const metadata: any = message?.metadata || {};
    if (metadata.error || metadata.streaming) {
        return false;
    }
    const eventType = String(metadata.uiEventType || '').trim();
    if (eventType === 'plan_step_blocked' || eventType === 'plan_step_failed'
        || eventType === 'approval' || eventType === 'approval_request'
        || eventType === 'question' || eventType === 'ask_user') {
        return false;
    }
    const status = String(metadata.status || '').trim().toLowerCase();
    return status !== 'running' && status !== 'failed' && status !== 'error' && status !== 'blocked' && status !== 'pending';
}

function durationOf(message: AgentMessage): number {
    const metadata: any = message?.metadata || {};
    const exact = Number(metadata.durationMs ?? metadata.elapsedMs);
    if (Number.isFinite(exact) && exact >= 0) {
        return exact;
    }
    const startedAt = Number(metadata.startedAt);
    const completedAt = Number(metadata.completedAt ?? metadata.endedAt ?? metadata.finishedAt);
    return Number.isFinite(startedAt) && Number.isFinite(completedAt) && completedAt >= startedAt
        ? completedAt - startedAt
        : 0;
}

function formatDuration(durationMs: number): string {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        return '';
    }
    if (durationMs < 1000) {
        return `${Math.round(durationMs)}ms`;
    }
    const seconds = durationMs / 1000;
    return `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1).replace(/\.0$/, '')}s`;
}

function stepOf(message: AgentMessage): AgentConsoleActivityStep {
    const presentation = presentAgentConsoleSessionContent(message);
    const metadata: any = message?.metadata || {};
    const label = String(
        metadata.uiEventLabel || message?.name || presentation.title || presentation.kind
    ).trim();
    const summary = String(presentation.summary || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const durationMs = durationOf(message);
    return {
        id: String(message?.id || ''),
        label: label || presentation.kind,
        summary,
        ...(durationMs > 0 ? { durationMs } : {})
    };
}

function buildActivityMessage(
    run: AgentMessage[],
    options: AgentConsoleActivityAggregationOptions
): AgentMessage {
    const steps = run.map(stepOf);
    const totalDuration = run.reduce((sum, message) => sum + durationOf(message), 0);
    const summaryParts = [options.formatSteps(run.length)];
    const total = formatDuration(totalDuration);
    if (total) {
        summaryParts.push(total);
    }
    const id = `__activity__${String(run[0]?.id || '')}`;
    const expanded = options.isExpanded(id);
    const lines = [summaryParts.join(' · ')];
    if (expanded) {
        for (const step of steps) {
            const parts = [step.label];
            if (step.summary && step.summary !== step.label) {
                parts.push(step.summary);
            }
            const duration = formatDuration(step.durationMs || 0);
            if (duration) {
                parts.push(duration);
            }
            lines.push(`✓ ${parts.join(' · ')}`);
        }
    }
    return {
        id,
        role: 'tool',
        name: '',
        content: lines.join('\n'),
        createdAt: Number(run[0]?.createdAt) || 0,
        metadata: {
            uiKind: 'activity',
            status: 'completed',
            activityCount: run.length,
            ...(totalDuration > 0 ? { durationMs: totalDuration } : {}),
            activitySteps: steps
        }
    } as AgentMessage;
}

/**
 * Collapse runs of finished tool/command/event steps into one activity row.
 *
 * `high` keeps today's per-step transcript. `medium`/`low` aggregate a run of
 * at least two terminal steps between conversation rows, keeping running and
 * failed steps visible so live progress and root causes are never hidden.
 * Expanding the synthetic row lists every step; the projection re-runs with
 * the extra lines.
 */
export function aggregateAgentConsoleActivity(
    messages: AgentMessage[],
    options: AgentConsoleActivityAggregationOptions
): AgentMessage[] {
    if (options.verbosity === 'high' || !messages.length) {
        return messages;
    }
    const result: AgentMessage[] = [];
    let run: AgentMessage[] = [];
    const flush = (): void => {
        if (run.length >= 2) {
            result.push(buildActivityMessage(run, options));
        } else if (run.length) {
            result.push(...run);
        }
        run = [];
    };
    const kinds = options.verbosity === 'low' ? LOW_VERBOSITY_KINDS : EXECUTION_KINDS;
    for (const message of messages) {
        const kind = presentAgentConsoleSessionContent(message).kind;
        if (kinds.has(kind) && isTerminalStep(message)) {
            run.push(message);
            continue;
        }
        flush();
        result.push(message);
    }
    flush();
    return result;
}
