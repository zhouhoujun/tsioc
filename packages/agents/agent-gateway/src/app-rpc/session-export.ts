import type { AgentMessage } from '@tsdi/agent';

export type SessionExportFormat = 'json' | 'jsonl';

export function resolveExportFormat(format?: unknown): SessionExportFormat {
    return String(format || '').trim().toLowerCase() === 'jsonl' ? 'jsonl' : 'json';
}

export function buildExportFileName(sessionId: string, exportedAt: number, format: SessionExportFormat): string {
    const ext = format === 'jsonl' ? 'jsonl' : 'json';
    const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, '-');
    const safeSessionId = String(sessionId || 'session').replace(/[^a-zA-Z0-9._-]+/g, '-');
    return `agent-session-${safeSessionId}-${stamp}.${ext}`;
}

export function resolveExportContentType(format: SessionExportFormat): string {
    return format === 'jsonl'
        ? 'application/x-ndjson; charset=utf-8'
        : 'application/json; charset=utf-8';
}

export function serializeSessionExport(
    format: SessionExportFormat,
    exportedAt: number,
    session: Record<string, any>,
    messages: AgentMessage[],
    toolCalls: Array<Record<string, any>>
): string {
    if (format === 'jsonl') {
        const lines = [
            JSON.stringify({ type: 'session', exportedAt, session }),
            ...messages.map(message => JSON.stringify({ type: 'message', message })),
            ...toolCalls.map(toolCall => JSON.stringify({ type: 'tool_call', toolCall }))
        ];
        return `${lines.join('\n')}\n`;
    }
    return JSON.stringify({
        type: 'session_export',
        format,
        exportedAt,
        session,
        messages,
        toolCalls
    }, null, 2);
}

export function collectExportToolCalls(messages: AgentMessage[]): Array<Record<string, any>> {
    const records: Array<Record<string, any>> = [];
    for (const message of messages || []) {
        const toolCalls = Array.isArray(message?.metadata?.toolCalls) ? message.metadata.toolCalls : [];
        for (const toolCall of toolCalls) {
            if (!toolCall || typeof toolCall !== 'object') {
                continue;
            }
            const id = typeof toolCall.id === 'string' ? toolCall.id : '';
            const name = typeof toolCall.name === 'string' ? toolCall.name : '';
            if (!id && !name) {
                continue;
            }
            records.push({
                id: id || null,
                name: name || null,
                input: toolCall.input ?? null,
                messageId: message.id,
                createdAt: message.createdAt
            });
        }
    }
    return records;
}
