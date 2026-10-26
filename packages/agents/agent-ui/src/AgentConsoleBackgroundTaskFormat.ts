import type { BackgroundTaskRecord } from '@tsdi/agent-tools';
import { formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel, formatAgentUiDateTime, type AgentUiTranslator } from './agent-ui.i18n';

/**
 * `/ps show <id>` detail block.
 *
 * Labels are UI copy and follow the host locale; every value (ids, status,
 * goal, error text, JSON payloads, report content) stays raw so operators can
 * copy it into a bug report. Extracted copy lives in the panel `ps` group.
 */
export function formatBackgroundTaskDetail(task: BackgroundTaskRecord, translator?: AgentUiTranslator | null): string {
    const label = (key: string, fallback: string, params?: Record<string, any>) =>
        panelLabel(translator, 'ps', key, fallback, params);
    const line = (key: string, value: string) =>
        label('detailLine', '  {label}: {value}', { label: label(key, key), value: value });
    const unavailable = label('detailUnavailable', 'n/a');
    const duration = task.startedAt
        ? `${Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000)}s`
        : unavailable;
    const lines = [
        label('detailTitle', 'Background task {id}', { id: task.id }),
        line('detailStatus', formatAgentPanelStatusLabel(translator, 'toolRuns', String(task.status))),
        line('detailSession', String(task.sessionId)),
        line('detailGoal', String(task.goal))
    ];
    lines.push(line('detailStarted', task.startedAt ? formatAgentUiDateTime(task.startedAt, translator) : unavailable));
    lines.push(line('detailDuration', duration));
    if (task.retryCount != null && task.retryCount > 0) {
        lines.push(line('detailRetries', String(task.retryCount)));
    }
    if (task.progress != null) {
        lines.push(line('detailProgress', `${Math.round(task.progress * 100)}%`));
    }
    if (task.usage) {
        lines.push(line('detailUsage', JSON.stringify(task.usage)));
    }
    if (task.error) {
        lines.push(line('detailError', typeof task.error === 'string' ? task.error : JSON.stringify(task.error)));
    }
    if (task.cause) {
        const cause = task.cause as { kind?: string; detail?: string };
        const kind = cause.kind || label('detailUnknown', 'unknown');
        lines.push(line('detailCause', cause.detail ? `${kind} - ${cause.detail}` : kind));
    }
    const result = task.result as { report?: { summary?: string; diff?: unknown; completed?: unknown; nextSteps?: unknown; risks?: unknown; artifacts?: unknown } } | undefined;
    const report = result?.report;
    if (report) {
        const block = (key: string, heading: string, body: string) => {
            lines.push(`\n  ${label(key, heading)}:\n${body.split('\n').map(row => `    ${row}`).join('\n')}`);
        };
        if (report.summary) {
            block('detailSummary', 'summary', String(report.summary));
        }
        if (report.completed) {
            block('detailCompleted', 'completed', JSON.stringify(report.completed, null, 2));
        }
        if (report.diff !== undefined) {
            block('detailDiff', 'diff', JSON.stringify(report.diff, null, 2));
        }
        if (report.artifacts !== undefined) {
            block('detailArtifacts', 'artifacts', JSON.stringify(report.artifacts, null, 2));
        }
        if (report.nextSteps !== undefined) {
            block('detailNextSteps', 'next steps', JSON.stringify(report.nextSteps, null, 2));
        }
        if (report.risks !== undefined) {
            block('detailRisks', 'risks', JSON.stringify(report.risks, null, 2));
        }
    } else if (task.status === 'running') {
        lines.push(`\n  ${label('detailRunning', '(running - no report yet)')}`);
    }
    return lines.join('\n');
}
