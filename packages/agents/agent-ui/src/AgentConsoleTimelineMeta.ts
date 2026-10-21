import { AgentMessage } from '@tsdi/agent';
import { AgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { formatTimelineSessionDuration } from './AgentConsoleTimelineWindow';
import type { AgentConsoleMessageTemplateKind } from './AgentConsoleMessageRenderers';

/**
 * Timeline row metadata (worked/done footer, durations, meta style).
 * Split out of `AgentConsoleMessageRenderers.ts` so the renderer stays within
 * the source-size budget; these helpers are pure formatting.
 */

export function resolveTimelineMeta(
    message: AgentMessage | undefined,
    templateKind: AgentConsoleMessageTemplateKind,
    statusLabel: string,
    showTimestamps = false
): string {
    const parts: string[] = [];
    let duration = '';
    const uiKind = String(message?.metadata?.uiKind || '').trim();
    if (templateKind === 'timelineHeader' || templateKind === 'timelineFooter' || templateKind === 'timelineCollapsed') {
        return '';
    }
    if (templateKind === 'timelineBoundary') {
        // P302: step boundary meta carries the optional step duration only;
        // the glyph column is the single state point (P289), timestamps and
        // textual status stay out of the row so it reads as a short title.
        const elapsedMs = Number(message?.metadata?.planStepElapsedMs);
        if (Number.isFinite(elapsedMs) && elapsedMs >= 0) {
            duration = formatTimelineSessionDuration(elapsedMs);
        }
        return duration ? duration : '';
    }
    if (uiKind === 'event') {
        // P237/rule 30: event rows expose total elapsed (backend durationMs
        // first, otherwise paired start/end); the caller renders it as the
        // trailing muted token so it stays at the end of the row.
        const durationMs = resolveMessageDurationMs(message);
        if (Number.isFinite(durationMs) && durationMs >= 0) {
            duration = formatTimelineDuration(durationMs);
        }
    } else if (templateKind === 'assistant') {
        // Final replies carry the worked/done summary; a preamble runs inside
        // the still-active turn, so a "done" footer there would mislead.
        const preamble = message?.metadata?.preamble === true || String(message?.metadata?.conversationPhase || '').trim() === 'preamble';
        const completedAt = Number(message?.metadata?.completedAt ?? message?.metadata?.endedAt ?? message?.metadata?.finishedAt ?? message?.createdAt);
        const durationMs = resolveMessageDurationMs(message);
        if (!preamble && Number.isFinite(completedAt) && Number.isFinite(durationMs) && Math.round(durationMs / 1000) > 0) {
            return `Worked for ${formatWorkedDuration(durationMs)} · done ${formatDoneTime(completedAt)}`;
        }
    }
    if (uiKind !== 'event'
        && templateKind !== 'user'
        && showTimestamps
        && typeof message?.createdAt === 'number'
        && Number.isFinite(message.createdAt)) {
        const date = new Date(message.createdAt);
        parts.push(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    }
    if (uiKind === 'event') {
        const label = String(message?.metadata?.label || '').trim();
        if (label) {
            parts.push(label);
        }
    }
    // Event rows keep meta purely factual (label/timestamp); the action hint
    // (`retry` / `重试` / `审批`) is rendered as a trailing muted token instead
    // of prefixing the row. The glyph column is the single state point (P289),
    // textual status stays in aria. Error rows already carry the semantic status
    // in their role label (`Error · `), so the generic label is not repeated.
    if (statusLabel && templateKind !== 'assistant' && templateKind !== 'error' && uiKind !== 'event') {
        parts.push(statusLabel);
    }
    const details = parts.join(' · ');
    return `${details}${duration ? ` (${duration})` : ''}`;
}

function formatWorkedDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDoneTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function resolveMessageDurationMs(message?: AgentMessage): number {
    const metadata = message?.metadata || {};
    const exact = Number(metadata.durationMs ?? metadata.elapsedMs);
    if (Number.isFinite(exact) && exact >= 0) return exact;
    const startedAt = Number(metadata.startedAt);
    const completedAt = Number(metadata.completedAt ?? metadata.endedAt ?? metadata.finishedAt);
    return Number.isFinite(startedAt) && Number.isFinite(completedAt) && completedAt >= startedAt
        ? completedAt - startedAt
        : NaN;
}

export function formatTimelineDuration(durationMs: number): string {
    if (durationMs < 1000) {
        return `${Math.round(durationMs)}ms`;
    }
    const seconds = durationMs / 1000;
    return `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1).replace(/\.0$/, '')}s`;
}

export function resolveTimelineMetaStyle(
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    void templateKind;
    return styleTextToObject(theme.statusLabel);
}

export function resolveMessageRoleLabel(templateKind: AgentConsoleMessageTemplateKind): string {
    switch (templateKind) {
        case 'user':
            return '› ';
        case 'assistant':
            return '• ';
        case 'tool':
            return '◦ ';
        case 'error':
            return '! ';
        default:
            return '· ';
    }
}

export function resolveMessageRoleStyle(theme: AgentConsoleTheme, templateKind: AgentConsoleMessageTemplateKind): Record<string, string> {
    switch (templateKind) {
        case 'user':
            return styleTextToObject(theme.statusValue);
        case 'assistant':
            return {
                ...styleTextToObject(theme.toolsAccent),
                'font-weight': 'bold'
            };
        case 'tool':
            return styleTextToObject(theme.toolsAccent);
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        default:
            return styleTextToObject(theme.statusLabel);
    }
}

export function resolveAgentConsoleMessageRoleLabel(message: AgentMessage | undefined, fallback: string): string {
    const uiKind = String(message?.metadata?.uiKind || '').trim();
    if (uiKind !== 'event') {
        return fallback;
    }
    const eventType = String(message?.metadata?.uiEventType || '').trim();
    if (/^tool_|^reasoning$/.test(eventType)) {
        return resolveMessageRoleLabel('tool');
    }
    if (eventType === 'error') {
        return resolveMessageRoleLabel('error');
    }
    return resolveMessageRoleLabel('system');
}
