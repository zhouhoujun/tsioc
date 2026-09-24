import type { BackgroundTaskRecord } from '@tsdi/agent-tools';

export function formatBackgroundTaskDetail(task: BackgroundTaskRecord): string {
    const lines = [
        `Background task ${task.id}`,
        `  status:    ${task.status}`,
        `  session:   ${task.sessionId}`,
        `  goal:      ${task.goal}`
    ];
    const duration = task.startedAt
        ? `${Math.round(((task.finishedAt ?? Date.now()) - task.startedAt) / 1000)}s`
        : 'n/a';
    lines.push(`  started:   ${task.startedAt ? new Date(task.startedAt).toLocaleString() : 'n/a'}`);
    lines.push(`  duration:  ${duration}`);
    if (task.retryCount != null && task.retryCount > 0) {
        lines.push(`  retries:   ${task.retryCount}`);
    }
    if (task.progress != null) {
        lines.push(`  progress:  ${Math.round(task.progress * 100)}%`);
    }
    if (task.usage) {
        lines.push(`  usage:     ${JSON.stringify(task.usage)}`);
    }
    if (task.error) {
        lines.push(`  error:     ${typeof task.error === 'string' ? task.error : JSON.stringify(task.error)}`);
    }
    if (task.cause) {
        const cause = task.cause as { kind?: string; detail?: string };
        lines.push(`  cause:     ${cause.kind || 'unknown'}${cause.detail ? ` - ${cause.detail}` : ''}`);
    }
    const result = task.result as { report?: { summary?: string; diff?: unknown; completed?: unknown; nextSteps?: unknown; risks?: unknown; artifacts?: unknown } } | undefined;
    const report = result?.report;
    if (report) {
        if (report.summary) {
            lines.push(`\n  summary:\n${String(report.summary).split('\n').map(l => `    ${l}`).join('\n')}`);
        }
        if (report.completed) {
            lines.push(`\n  completed:\n${JSON.stringify(report.completed, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
        }
        if (report.diff !== undefined) {
            lines.push(`\n  diff:\n${JSON.stringify(report.diff, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
        }
        if (report.artifacts !== undefined) {
            lines.push(`\n  artifacts:\n${JSON.stringify(report.artifacts, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
        }
        if (report.nextSteps !== undefined) {
            lines.push(`\n  next steps:\n${JSON.stringify(report.nextSteps, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
        }
        if (report.risks !== undefined) {
            lines.push(`\n  risks:\n${JSON.stringify(report.risks, null, 2).split('\n').map(l => `    ${l}`).join('\n')}`);
        }
    } else if (task.status === 'running') {
        lines.push('\n  (running - no report yet)');
    }
    return lines.join('\n');
}
