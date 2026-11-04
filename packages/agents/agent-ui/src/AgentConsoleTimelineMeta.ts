import { AgentMessage } from '@tsdi/agent';
import { AgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { formatTimelineSessionDuration } from './AgentConsoleTimelineWindow';
import { formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { isAgentConsoleAssistantPreamble } from './AgentConsoleSessionContentPresenter';
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
    showTimestamps = false,
    translator?: AgentUiTranslator | null
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
    } else if (templateKind === 'assistant' && shouldRenderWorkedSummary(message)) {
        const completedAt = workedSummaryDoneAt(message);
        const durationMs = resolveMessageDurationMs(message);
        return formatAgentUiLabel(translator, 'agent.timeline.workedFor', 'Worked for {duration} · done {time}', {
            duration: formatWorkedDuration(durationMs), time: formatDoneTime(completedAt)
        });
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
    // A successful `!shell` row already carries the ✓ glyph and the command text;
    // the extra "Success" word only pushes the command to the right.
    const shellSuccess = String(message?.metadata?.type || '') === 'shell'
        && String(message?.metadata?.status || '').toLowerCase() === 'success';
    if (statusLabel && !shellSuccess && templateKind !== 'assistant' && templateKind !== 'error' && uiKind !== 'event') {
        parts.push(statusLabel);
    }
    const details = parts.join(' · ');
    return `${details}${duration ? ` (${duration})` : ''}`;
}

/**
 * Final replies carry the worked/done summary; a preamble runs inside the
 * still-active turn, so a "done" footer there would mislead. The predicate also
 * covers narration attached to tool calls (no explicit `preamble` flag),
 * otherwise an intermediate step gets a fake footer while the turn still runs.
 */
export function shouldRenderWorkedSummary(message: AgentMessage | undefined): boolean {
    // Only final assistant replies get the footer; event rows carry their own
    // duration token and must never be mistaken for a worked/done summary.
    if (String(message?.metadata?.uiKind || '').trim() === 'event') {
        return false;
    }
    const completedAt = workedSummaryDoneAt(message);
    const durationMs = resolveMessageDurationMs(message);
    return !isAgentConsoleAssistantPreamble(message)
        && Number.isFinite(completedAt)
        && Number.isFinite(durationMs)
        && Math.round(durationMs / 1000) > 0;
}

function workedSummaryDoneAt(message: AgentMessage | undefined): number {
    return Number(message?.metadata?.completedAt ?? message?.metadata?.endedAt ?? message?.metadata?.finishedAt ?? message?.createdAt);
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

const COMMAND_STATUS_WORDS = ['running', 'completed', 'failed', 'cancelled'];

/**
 * Normalize the status word of a `command-execution` row at render time. Some
 * hosts persist the English template (`<command> completed`) before the locale
 * is known, so the exact trailing token is rewritten through the host
 * translator; any other content stays verbatim.
 */
export function localizeCommandExecutionStatus(content: string, translator?: AgentUiTranslator | null): string {
    const text = String(content || '');
    const word = COMMAND_STATUS_WORDS.find(candidate => text === candidate || text.endsWith(` ${candidate}`));
    if (!word) {
        return text;
    }
    const localized = formatAgentUiLabel(translator, `agent.command.status.${word}`, word);
    if (localized === word) {
        return text;
    }
    return `${text.slice(0, text.length - word.length)}${localized}`;
}

/**
 * Normalize the persisted tool-result marker at render time. The runtime writes
 * `<path> (truncated)` before the locale is known; the trailing marker is UI
 * copy, so it follows the host locale while the path stays verbatim.
 */
export function localizeTimelineContentSuffix(content: string, translator?: AgentUiTranslator | null): string {
    const text = String(content || '');
    const marker = ' (truncated)';
    if (!text.endsWith(marker)) {
        return text;
    }
    const localized = formatAgentUiLabel(translator, 'agent.timeline.truncated', '(truncated)');
    if (localized === '(truncated)') {
        return text;
    }
    // Fullwidth punctuation already carries its own spacing.
    const joiner = /^[（【]/.test(localized) ? '' : ' ';
    return `${text.slice(0, text.length - marker.length)}${joiner}${localized}`;
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

/**
 * Compose the role cell for one rendered row.
 *
 * Timeline rows already carry their status glyph, so a registry label would
 * add a second vertical rule. Tool event rows also open with their own
 * verb/object (`Read file · README.md`) and drop the `Tool · ` family label;
 * the glyph alone carries state.
 */
export function resolveEffectiveRoleLabel(
    timelineEvent: boolean,
    kind: string,
    roleLabel: string,
    criticalMark: string,
    hasRendererRegistry: boolean
): string {
    if (!timelineEvent) return `${criticalMark}${roleLabel}`;
    if (kind === 'tool') return criticalMark;
    return `${criticalMark}${hasRendererRegistry ? roleLabel : ''}`;
}
