import { summarizeToolDisplayText } from '@tsdi/agent';
import { formatTimelineEventLine, presentTimelineToolEvent } from './AgentConsoleTimelineEventPresenter';
import type { AgentMessage } from '@tsdi/agent';

export function normalizeLoadedMessages(messages: AgentMessage[] = []): AgentMessage[] {
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
            const projected = projectLoadedToolMessage(message);
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
function projectLoadedToolMessage(message: AgentMessage): AgentMessage | null {
    const payload = String(message.content || '');
    const metadata = (message.metadata || {}) as Record<string, any>;
    const receipt = (metadata.receipt || {}) as Record<string, any>;
    const toolName = String(message.name || receipt.toolName || '').trim();
    const summary = summarizeToolDisplayText(toolName, payload, 'output');
    if (!summary) {
        return null;
    }
    const inputSummary = summarizeToolDisplayText(toolName, metadata.toolCallInput ?? {}, 'input');
    // Same row composition as the live bridge, so a resumed row reads like the
    // one the user saw while the turn ran.
    const rowText = formatTimelineEventLine(presentTimelineToolEvent({ toolName, inputSummary, outputSummary: summary }))
        || summary;
    let parsed: any;
    try {
        parsed = payload.trim().startsWith('{') ? JSON.parse(payload) : undefined;
    } catch {
        parsed = undefined;
    }
    const exitCode = Number(parsed?.exitCode ?? parsed?.exit_code);
    const failed = Number.isFinite(exitCode)
        ? exitCode !== 0
        : !!(parsed?.error || parsed?.timedOut || metadata.error);
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
