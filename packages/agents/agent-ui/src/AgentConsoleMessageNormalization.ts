import type { AgentMessage } from '@tsdi/agent';

export function normalizeLoadedMessages(messages: AgentMessage[] = []): AgentMessage[] {
    const normalized: AgentMessage[] = [];
    for (const message of messages) {
        if (!message) {
            continue;
        }
        // Tool-call payloads are projected into compact timeline/event
        // rows; replaying the raw `tool` messages would print large JSON
        // blobs (including embedded source files) on startup.
        if (message.role === 'tool' && message.metadata?.uiKind !== 'event') {
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
