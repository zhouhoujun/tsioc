import { AgentMessage } from '@tsdi/agent';
import { formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';
import type { AgentConsoleMarkdownTone } from './AgentConsoleMarkdown';
import { resolveAgentConsoleMarkdownToneStyle } from './AgentConsoleMarkdownStyles';
import { presentAgentConsoleSessionContent } from './AgentConsoleSessionContentPresenter';
import { resolveMessageDurationMs } from './AgentConsoleTimelineMeta';
import { AgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import type {
    AgentConsoleInlineRowStyle,
    AgentConsoleMessageStatus,
    AgentConsoleMessageStatusLabels,
    AgentConsoleMessageTemplateKind,
    AgentConsoleRenderedLine
} from './AgentConsoleMessageRenderers';

export function resolveMessageTemplateKind(message?: AgentMessage | null): AgentConsoleMessageTemplateKind {
    // Plan todo messages are synthesized by the session state and rendered
    // inline in the conversation flow with a distinct visual treatment.
    if (message?.metadata?.uiKind === 'plan-todo') {
        return 'planTodo';
    }
    if (message?.metadata?.uiKind === 'file-change') {
        return 'fileChange';
    }
    if (message?.metadata?.uiKind === 'timeline-boundary') {
        return 'timelineBoundary';
    }
    if (message?.metadata?.uiKind === 'timeline-header') {
        return 'timelineHeader';
    }
    if (message?.metadata?.uiKind === 'timeline-footer') {
        return 'timelineFooter';
    }
    if (message?.metadata?.uiKind === 'timeline-collapsed') {
        return 'timelineCollapsed';
    }
    // Shell messages stay in the 'tool' template even on failure; their
    // failed/error state is carried by the status, not by the template.
    if (message?.metadata?.error && message?.metadata?.type !== 'shell') {
        return 'error';
    }
    switch (String(message?.role || '').toLowerCase()) {
        case 'user':
            return 'user';
        case 'assistant':
            return 'assistant';
        case 'tool':
            return 'tool';
        default:
            return 'system';
    }
}

export function resolveAgentConsoleMessageStatus(
    message?: AgentMessage | null,
    templateKind: AgentConsoleMessageTemplateKind = resolveMessageTemplateKind(message)
): AgentConsoleMessageStatus | undefined {
    if (!message || templateKind === 'user' || templateKind === 'timelineHeader'
        || templateKind === 'timelineFooter' || templateKind === 'timelineCollapsed') {
        return undefined;
    }
    if (message?.metadata?.uiKind === 'plan-todo') {
        const items: any[] = Array.isArray(message.metadata.planItems) ? message.metadata.planItems : [];
        if (!items.some(item => item.status === 'pending' || item.status === 'in_progress')) return 'success';
        return message.metadata.planLive === false ? undefined : 'running';
    }
    if (message?.metadata?.uiKind === 'command-execution') {
        // A running/failed slash command must show ● / ✕, not the default ✓.
        const status = String(message.metadata.status || '').trim();
        return status === 'running' ? 'running' : status === 'failed' || status === 'error' ? 'failed' : 'success';
    }
    if (message?.metadata?.uiKind === 'event') {
        const eventType = String(message.metadata.uiEventType || '').trim();
        // P292: the remote bridge reports plan_step_blocked with status
        // 'running' (the step id is in the content); the event type is the
        // authoritative state so the row shows ⊘ 阻塞 instead of a running ●.
        // Same for a failed step that arrives without an explicit error status.
        if (eventType === 'plan_step_blocked') return 'blocked';
        if (eventType === 'plan_step_failed') return 'failed';
        const status = String(message.metadata.status || '').trim();
        if (status === 'running' || status === 'success' || status === 'failed' || status === 'error' || status === 'blocked') return status as AgentConsoleMessageStatus;
    }
    if (message?.metadata?.streaming) {
        return 'running';
    }
    if (String(message.role || '').toLowerCase() === 'tool' && message?.metadata?.error) {
        return 'failed';
    }
    if (templateKind === 'timelineBoundary') {
        // P302: the step boundary shows the active step's own state as its
        // glyph — the boundary is a state point, not a static divider.
        switch (String(message?.metadata?.planStepStatus || '').trim()) {
            case 'in_progress':
            case 'pending':
                return 'running';
            case 'failed':
                return 'failed';
            default:
                return 'success';
        }
    }
    if (templateKind === 'error') {
        return 'error';
    }
    return 'success';
}

export function resolveAgentConsoleMessageStatusLabel(
    status?: AgentConsoleMessageStatus,
    labels?: AgentConsoleMessageStatusLabels
): string {
    switch (status) {
        case 'running':
            return labels?.running || '正在执行';
        case 'failed':
            return labels?.failed || '失败';
        case 'error':
            return labels?.error || '错误';
        case 'blocked':
            return labels?.blocked || '阻塞';
        case 'success':
            return labels?.success || '成功';
        default:
            return '';
    }
}

export function deriveTimelineDurations(messages: AgentMessage[]): AgentMessage[] {
    let turnStartedAt = NaN;
    return messages.map(message => {
        const createdAt = Number(message?.createdAt);
        if (String(message?.role || '').toLowerCase() === 'user') {
            if (Number.isFinite(createdAt)) turnStartedAt = createdAt;
            return message;
        }
        const presentation = presentAgentConsoleSessionContent(message);
        if (presentation.kind !== 'assistant-final' || Number.isFinite(resolveMessageDurationMs(message))
            || !Number.isFinite(turnStartedAt) || !Number.isFinite(createdAt) || createdAt < turnStartedAt) {
            return message;
        }
        return { ...message, metadata: { ...(message.metadata || {}), durationMs: createdAt - turnStartedAt } };
    });
}

export const TIMELINE_EVENT_ROW_CONTENT_MAX = 200;

// Long stdout/diff bodies belong to the event inspector; rows keep a bounded
// summary. CJK/emoji count as 2 columns so the row stays within a stable
// display width. Failed/error rows stay expanded by default so the cause is
// visible; plan-step failed/blocked rows stay expanded by event type because
// the bridge pins their status to 'running' (P237/P292).
export function truncateTimelineEventRowContent(
    content: string,
    statusKind?: AgentConsoleMessageStatus,
    eventType = ''
): string {
    const text = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .find(line => line && !/^(?:\d+\.|[-*+•◦▪])$/.test(line)) || '';
    if (getDisplayWidth(text) <= TIMELINE_EVENT_ROW_CONTENT_MAX) {
        return text;
    }
    return `${sliceByDisplayWidth(text, TIMELINE_EVENT_ROW_CONTENT_MAX).replace(/\s+$/, '')}…`;
}

export function resolveTimelineEventActionLabel(message?: AgentMessage | null,
    statusKind?: AgentConsoleMessageStatus, translator?: AgentUiTranslator | null): string {
    const metadata = message?.metadata || {};
    if (metadata.uiKind !== 'event') {
        return '';
    }
    const eventType = String(metadata.uiEventType || '').trim();
    const failed = statusKind === 'failed' || statusKind === 'error';
    if ((eventType.startsWith('tool_') || eventType === 'tool_call') && failed) {
        return formatAgentUiLabel(translator, 'agent.timeline.actionRetry', '重试');
    }
    if (eventType.startsWith('plan_step_') && (failed || statusKind === 'blocked'
        || eventType === 'plan_step_blocked' || String(metadata.status || '') === 'blocked')) {
        return formatAgentUiLabel(translator, 'agent.timeline.actionRetry', '重试');
    }
    if (eventType === 'approval' || eventType === 'approval_request') {
        return formatAgentUiLabel(translator, 'agent.timeline.actionReview', '审批');
    }
    return '';
}

// Timeline status glyphs — the single visual state point of an event row
// (P289). running ● / success ✓ / failed|error ✕ / blocked ⊘.
export function resolveDefaultStatusGlyph(status?: AgentConsoleMessageStatus): string {
    switch (status) {
        case 'running':
            return '●';
        case 'success':
            return '✓';
        case 'failed':
        case 'error':
            return '✕';
        case 'blocked':
            return '⊘';
        default:
            return '';
    }
}

export function resolveRenderedLineToneStyle(
    theme: AgentConsoleTheme,
    line: AgentConsoleRenderedLine,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind,
    timelineEvent = false
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    const tone = resolveRenderedLineTone(line);
    if (!timelineEvent || tone !== 'default') {
        return resolveAgentConsoleMarkdownToneStyle(tone, theme, templateKind);
    }
    switch (line.statusKind) {
        case 'success':
            return styleTextToObject(theme.statusLabel);
        case 'failed':
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        case 'blocked':
            return styleTextToObject(theme.statusBusyValue);
        default:
            return styleTextToObject(theme.statusValue);
    }
}

export function resolveRenderedLineTone(line: AgentConsoleRenderedLine): AgentConsoleMarkdownTone {
    if (line.tone && line.tone !== 'default') {
        return line.tone;
    }
    const tokenTone = line.tokens.find(token => token.tone && token.tone !== 'default')?.tone;
    return tokenTone || 'default';
}

export function resolveInlineRowStyle(style: Record<string, string>): AgentConsoleInlineRowStyle {
    const inlineStyle: AgentConsoleInlineRowStyle = {};
    if (style.color) {
        inlineStyle.color = style.color;
    }
    if (style['font-weight']) {
        inlineStyle['font-weight'] = style['font-weight'];
    }
    return inlineStyle;
}

export function resolveTimelineEventItemStyle(
    theme: AgentConsoleTheme,
    style: Record<string, string>,
    status: AgentConsoleMessageStatus | undefined,
    rowSelected: boolean
): Record<string, string> {
    void theme;
    void status;
    void rowSelected;
    return {
        ...style,
        margin: '0'
    };
}

export function resolveAgentConsoleMessageStatusStyle(
    theme: AgentConsoleTheme,
    status?: AgentConsoleMessageStatus,
    rowSelected = false
): Record<string, string> {
    if (rowSelected || !status) {
        return {};
    }
    switch (status) {
        case 'running':
            return styleTextToObject(theme.statusBusyValue);
        case 'failed':
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        case 'blocked':
            return styleTextToObject(theme.statusBusyValue);
        default:
            return styleTextToObject(theme.statusIdleValue);
    }
}

export function formatAgentConsoleMessageStatus(status?: AgentConsoleMessageStatus, symbol = ''): string {
    if (!status) {
        return '';
    }
    return symbol ? `${symbol} ` : '';
}
