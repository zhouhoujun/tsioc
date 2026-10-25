import type { TimelineEntry } from '@tsdi/agent';

/**
 * Timeline replay projection: renders the row text written into seeded timeline
 * messages when a session is resumed. Pure formatting, extracted from
 * `AgentConsoleSessionState` so the state class keeps only data plumbing and its
 * source-size budget keeps shrinking.
 *
 * The caller supplies `text` (key + English fallback + params) so the copy is
 * resolved through the host translator without this module importing i18n.
 */

export type TimelineProjectText = (key: string, fallback: string, params?: Record<string, any>) => string;

function defaultText(_key: string, fallback: string, params?: Record<string, any>): string {
    return fallback.replace(/\{(\w+)\}/g, (_match, name: string) => String(params?.[name] ?? ''));
}

export function projectTimelineContent(entry: TimelineEntry, t?: TimelineProjectText): string {
    const text = t || defaultText;
    const rawLabel = String(entry.label || entry.kind || '').trim();
    if (isTimelineStructureOnlyLabel(rawLabel)) {
        return '';
    }
    const label = summarizeTimelineEntryText(rawLabel, 120) || entry.kind;
    if (entry.kind === 'tool') {
        const tool = label.replace(/[._-]+/g, ' ');
        if (entry.status === 'running') {
            return text('toolRunning', 'Running {label}', { label: tool });
        }
        if (entry.status === 'failed') {
            const error = summarizeTimelineEntryText(entry.error || entry.summary, 160) || text('unknownError', 'unknown error');
            return text('toolFailed', '{label} failed: {error}', { label: tool, error: error });
        }
        const duration = typeof entry.durationMs === 'number' ? ` · ${entry.durationMs}ms` : '';
        return text('toolCompleted', '{label} completed{duration}', { label: tool, duration: duration });
    }
    if (entry.kind === 'step') {
        const verb = entry.status === 'running' ? 'started' : entry.status === 'blocked' ? 'blocked' : entry.status === 'failed' ? 'failed' : entry.status === 'cancelled' ? 'cancelled' : 'completed';
        const term = verb.charAt(0).toUpperCase() + verb.slice(1);
        const reason = entry.status === 'blocked' && entry.detail ? ` (${entry.detail})` : '';
        return text(`step${term}`, `Step ${verb}: {label}{reason}`, { label: label, reason: reason });
    }
    if (entry.kind === 'plan') {
        if (entry.status === 'completed') {
            return text('planCompleted', 'Plan completed: {label}', { label: entry.label });
        }
        if (entry.status === 'pending') {
            return text('planCreated', 'Plan created: {label}', { label: entry.label });
        }
        return text('planStatus', 'Plan {status}: {label}', { status: entry.status, label: entry.label });
    }
    if (entry.kind === 'turn') {
        if (entry.status === 'completed') {
            return text('turnCompleted', 'Turn completed');
        }
        if (entry.status === 'cancelled') {
            return text('turnCancelled', 'Turn cancelled');
        }
        return text('turnStarted', 'Turn started');
    }
    return `${entry.kind}: ${label}`;
}

function isTimelineStructureOnlyLabel(value: string): boolean {
    return !!value && !value.replace(/(?:^|\s)(?:\d+\.|[-*+•◦▪])(?=\s|$)/g, '').trim();
}

function summarizeTimelineEntryText(value: unknown, maxLength: number): string {
    const text = String(value || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .find(Boolean) || '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 3)).trimEnd()}...`;
}
