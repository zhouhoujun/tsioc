import { summarizeToolDisplayText } from '@tsdi/agent';
import { formatToolEventRow } from './AgentConsoleStreamHelpers';
import { formatTimelineEventLine, presentTimelineToolEvent } from './AgentConsoleTimelineEventPresenter';
import type { AgentMessage } from '@tsdi/agent';
import type { AgentUiTranslator } from './agent-ui.i18n';

export interface NormalizeLoadedMessagesOptions {
    /**
     * Translator used to resolve the same localized tool label the live stream
     * rows use (`Read file`, `Run command`, …). Without it a resumed row would
     * fall back to the presenter's category verb (`Read`) and stop matching the
     * row the user saw while the turn ran.
     */
    translator?: AgentUiTranslator | null;
}

export function normalizeLoadedMessages(
    messages: AgentMessage[] = [],
    options: NormalizeLoadedMessagesOptions = {}
): AgentMessage[] {
    const normalized: AgentMessage[] = [];
    for (const message of messages) {
        if (!message) {
            continue;
        }
        // Tool-call payloads are projected into compact timeline/event rows:
        // replaying the raw `tool` messages would print large JSON blobs
        // (including embedded source files), but dropping them lost the tool
        // history after a restart. The projected row keeps the toolCallId so
        // the event inspector can fetch the payload on demand.
        if (message.role === 'tool' && message.metadata?.uiKind !== 'event') {
            const projected = projectLoadedToolMessage(message, options);
            if (!projected) {
                continue;
            }
            normalized.push(projected);
            continue;
        }
        if (message.role === 'assistant' && !String(message.content || '').trim()) {
            continue;
        }
        // Older sessions may contain an accidentally persisted host
        // transcript (tool payloads, file listings and role separators)
        // instead of a chat message. Never dump that raw transcript into
        // the startup viewport.
        const content = String(message.content || '');
        const transcriptMarkers = content.match(/(?:^|\|\s*)(?:assistant|tool|user):/g) || [];
        if (transcriptMarkers.length >= 2
            || (transcriptMarkers.length >= 1
                && (content.includes('truncated') || content.includes('"path"') || content.includes('path":"'))))
            continue;
        const previous = normalized[normalized.length - 1];
        if (message.role === 'assistant'
            && message.metadata?.error
            && previous?.role === 'assistant'
            && previous?.metadata?.error
            && String(previous.content || '').trim() === String(message.content || '').trim()) {
            continue;
        }
        normalized.push(message);
    }
    return normalized;
}

/** Project one stored `tool` message into a read-only timeline event row. */
function projectLoadedToolMessage(
    message: AgentMessage,
    options: NormalizeLoadedMessagesOptions = {}
): AgentMessage | null {
    const payload = String(message.content || '');
    const metadata = (message.metadata || {}) as Record<string, any>;
    const receipt = (metadata.receipt || {}) as Record<string, any>;
    const toolName = String(message.name || receipt.toolName || '').trim();
    // Prefer the receipt summaries: they are exactly what the live
    // `run.turn_stream` event rendered while the turn ran, so a resumed row
    // stays byte-identical instead of being re-derived from the payload.
    const inputSummary = pickSummary(receipt.inputSummary, metadata.inputSummary,
        () => summarizeToolDisplayText(toolName, metadata.toolCallInput ?? {}, 'input'));
    const outputSummary = pickSummary(receipt.outputSummary, undefined,
        () => summarizeToolDisplayText(toolName, payload, 'output'));
    if (!inputSummary && !outputSummary) {
        return null;
    }
    let parsed: any;
    try {
        parsed = payload.trim().startsWith('{') ? JSON.parse(payload) : undefined;
    } catch {
        parsed = undefined;
    }
    const exitCode = Number(parsed?.exitCode ?? parsed?.exit_code);
    const failed = Number.isFinite(exitCode)
        ? exitCode !== 0
        : !!(parsed?.error || parsed?.timedOut || metadata.error || receipt.error || receipt.status === 'error');
    const rowText = composeLoadedToolRow(toolName, inputSummary, outputSummary, metadata, parsed, failed, options.translator);
    return {
        ...message,
        role: 'assistant',
        content: rowText,
        metadata: {
            ...metadata,
            uiKind: 'event',
            uiEventType: failed ? 'tool_failed' : 'tool_completed',
            uiEventLabel: toolName || 'tool',
            status: failed ? 'failed' : 'success',
            durationMs: typeof receipt.durationMs === 'number' ? receipt.durationMs : metadata.durationMs,
            timeline: {
                ...(metadata.timeline || {}),
                toolCallId: message.toolCallId,
                receiptId: receipt.receiptId,
                source: 'local'
            }
        }
    };
}

function pickSummary(...candidates: Array<unknown>): string {
    for (const candidate of candidates) {
        const value = typeof candidate === 'function' ? (candidate as () => unknown)() : candidate;
        const text = normalizeSummaryText(value);
        if (text) {
            return text;
        }
    }
    return '';
}

function normalizeSummaryText(value: unknown): string {
    if (typeof value === 'string') {
        return value.trim();
    }
    if (value instanceof Error) {
        return value.message.trim();
    }
    if (value && typeof value === 'object' && typeof (value as { message?: unknown }).message === 'string') {
        return String((value as { message: string }).message).trim();
    }
    return '';
}

/**
 * Compose the replayed row with the live row formula.
 *
 * Live chunks carry `"<toolName> · <input> · <output>"` and agent-ui maps them
 * through `describeStreamEventContent`, which resolves the localized label and
 * drops success words. Replaying through the same helper keeps one identity per
 * tool call: the old presenter path produced `Read README.md · README.md
 * (truncated)` (category verb + duplicated object) for a row that read
 * `Read file · README.md (truncated)` while the turn ran.
 */
function composeLoadedToolRow(
    toolName: string,
    inputSummary: string,
    outputSummary: string,
    metadata: Record<string, any>,
    parsed: any,
    failed: boolean,
    translator?: AgentUiTranslator | null
): string {
    if (!toolName) {
        return formatTimelineEventLine(presentTimelineToolEvent({ toolName, inputSummary, outputSummary }))
            || outputSummary
            || inputSummary;
    }
    const reason = failed
        ? pickSummary(metadata.error, metadata.receipt?.error, parsed?.error)
        : '';
    return formatToolEventRow(toolName, inputSummary, outputSummary, reason, translator);
}
