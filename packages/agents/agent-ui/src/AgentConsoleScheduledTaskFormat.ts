import { formatAgentPanelLabel, type AgentUiTranslator } from './agent-ui.i18n';

interface ScheduledTaskLike {
    sessionId?: string;
    scheduleType?: string;
    cancelled?: boolean;
    running?: boolean;
    paused?: boolean;
    prompt?: string;
    runAt?: number;
    nextRunAt?: number;
    lastRunAt?: number;
    runCount?: number;
    failureCount?: number;
    manualRecoveryRequired?: boolean;
    alertOnFailure?: boolean;
    lastError?: string;
}

function timestamp(value?: number): string {
    return typeof value === 'number' && Number.isFinite(value) ? new Date(value).toISOString() : '';
}

/**
 * Detail rows for the selected scheduled job. Lives in the presentation layer
 * (not `AgentConsoleSessionState`) so the session state keeps carrying data only
 * while the rows follow the host locale.
 */
export function formatScheduledTaskDetailLines(
    selected: ScheduledTaskLike,
    translator?: AgentUiTranslator | null
): string[] {
    const label = (key: string, fallback: string, params?: Record<string, any>) =>
        formatAgentPanelLabel(translator, 'jobs', key, fallback, params);
    const status = selected.cancelled ? 'statusCancelled'
        : selected.running ? 'statusRunning'
            : selected.paused ? 'statusPaused'
                : 'statusIdle';
    return [
        label('detailSession', 'session {id}', { id: selected.sessionId }),
        label('detailSchedule', 'schedule {type}', { type: selected.scheduleType || 'once' }),
        label('detailStatus', 'status {status}', { status: label(status, status.replace(/^status/, '').toLowerCase()) }),
        selected.prompt ? label('detailPrompt', 'prompt {prompt}', { prompt: selected.prompt }) : '',
        selected.runAt ? `${label('detailRunAt', 'runAt')} ${timestamp(selected.runAt)}` : '',
        selected.nextRunAt ? `${label('detailNextRunAt', 'nextRunAt')} ${timestamp(selected.nextRunAt)}` : '',
        selected.lastRunAt ? `${label('detailLastRunAt', 'lastRunAt')} ${timestamp(selected.lastRunAt)}` : '',
        selected.runCount != null ? label('detailRunCount', 'runCount {count}', { count: selected.runCount }) : '',
        selected.failureCount != null ? label('detailFailureCount', 'failureCount {count}', { count: selected.failureCount }) : '',
        selected.manualRecoveryRequired ? label('detailManualRecovery', 'manual recovery required') : '',
        selected.alertOnFailure ? label('detailAlertOnFailure', 'alert on failure') : '',
        selected.lastError ? label('detailLastError', 'lastError {error}', { error: selected.lastError }) : ''
    ].filter(Boolean);
}
