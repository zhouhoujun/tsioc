import type { AgentMessage } from '@tsdi/agent';
import { resolveHumanStatusWord } from './AgentConsoleTimelineEventPresenter';
import type { AgentConsoleTimelineLabels } from './AgentConsoleTimelineWindow';

/**
 * Context the event inspector needs from `AgentConsoleSessionState`.
 * Kept explicit so the formatter stays pure and testable.
 */
export interface TimelineEventInspectorContext {
    event?: AgentMessage;
    output: string;
    outputLoading: boolean;
    labels: AgentConsoleTimelineLabels;
    translate(key: string, params: Record<string, any> | undefined, fallback: string): string;
    formatDuration(ms: number): string;
}

/**
 * Lines of the `── Event Inspector ──` overlay.
 *
 * Extracted from `AgentConsoleSessionState.timelineEventDetailLines` (source
 * size ratchet) and localized through `agent.menu.panel.inspector.*`: the
 * section titles, field labels and key hints are UI copy, while the status
 * word, event type, source, ids and payload text stay raw so operators can
 * copy them into a bug report.
 */
export function formatTimelineEventInspectorLines(ctx: TimelineEventInspectorContext): string[] {
    const event = ctx.event;
    if (!event) {
        return [];
    }
    const t = (key: string, fallback: string, params?: Record<string, any>) =>
        ctx.translate(`agent.menu.panel.inspector.${key}`, params, fallback);
    const m: any = (event as any).metadata || {};
    const timeline = m.timeline || {};
    const status = m.status || 'running';
    const eventType = m.uiEventType || 'unknown';
    const durationMs = m.durationMs;
    const sequence = timeline.sequence;
    const source = timeline.source || 'local';
    const toolCallId = timeline.toolCallId || '';
    const receiptId = timeline.receiptId || '';
    const attempt = timeline.attempt;

    const lines: string[] = [t('title', '── Event Inspector ──────────────────────────'), ''];
    const content = String((event as any).content || '');
    if (content) {
        content.split('\n').forEach(line => lines.push(line));
    } else {
        lines.push(t('contentEmpty', '(no content)'));
    }
    if (ctx.output) {
        lines.push('');
        lines.push(`── ${ctx.translate('agent.timeline.rawOutput', undefined, 'Raw output')} ──────────────────────────────`);
        String(ctx.output).split('\n').forEach(line => lines.push(line));
    } else if (ctx.outputLoading) {
        lines.push('');
        lines.push(ctx.translate('agent.timeline.loadingOutput', undefined, 'Loading raw output…'));
    }
    lines.push('');
    lines.push(t('statusLine', 'Status:     {value}', { value: resolveHumanStatusWord(status, ctx.labels) }));
    if (durationMs != null) {
        lines.push(t('durationLine', 'Duration:   {value}', { value: ctx.formatDuration(durationMs) }));
    }
    lines.push('');
    lines.push(t('diagnosticTitle', '── Diagnostic ──────────────────────────────'));
    lines.push(t('typeLine', 'Type:       {value}', { value: eventType }));
    if (sequence != null) {
        lines.push(t('sequenceLine', 'Sequence:   {value}', { value: sequence }));
    }
    lines.push(t('sourceLine', 'Source:     {value}', { value: source }));
    if (toolCallId) {
        lines.push(t('toolCallIdLine', 'ToolCallID: {value}', { value: toolCallId }));
    }
    if (receiptId) {
        lines.push(t('receiptIdLine', 'ReceiptID:  {value}', { value: receiptId }));
    }
    if (attempt != null && attempt > 1) {
        lines.push(t('attemptLine', 'Attempt:    {value}', { value: attempt }));
    }
    lines.push('');
    lines.push(t('keyBindingsTitle', '── Key Bindings ─────────────────────────────'));
    lines.push(t('keyRetry', '  r       retry tool call (if failed)'));
    lines.push(t('keyCopy', '  copy    copy event detail'));
    lines.push(t('keyScroll', '  ↑/↓     scroll detail'));
    lines.push(t('keyPage', '  PgUp/PgDn  scroll page'));
    lines.push(t('keyColumns', '  ←/→     scroll columns'));
    lines.push(t('keyJump', '  Home/End   jump to start/end'));
    lines.push(t('keyClose', '  Enter/Esc  close inspector'));
    return lines;
}
