import type { AgentMessage } from '@tsdi/agent';
import type { AgentSessionExportFormat, AgentSessionExportResult } from './AgentConsoleSessionService';

export function normalizeExportFormat(format?: string): AgentSessionExportFormat {
        const value = String(format || '').trim().toLowerCase();
        return value === 'jsonl' ? 'jsonl' : value === 'html' ? 'html' : 'json';
    }

export function normalizeExportResult(
        sessionId: string,
        format: AgentSessionExportFormat,
        result: any
    ): AgentSessionExportResult {
        const exportedAt = Number(result?.exportedAt ?? Date.now());
        const messages = Array.isArray(result?.messages) ? result.messages : [];
        const toolCalls = Array.isArray(result?.toolCalls) ? result.toolCalls : collectExportToolCalls(messages);
        const session = result?.session && typeof result.session === 'object'
            ? result.session
            : {
                id: sessionId,
                messageCount: messages.length,
                toolCallCount: toolCalls.length
            };
        return {
            sessionId,
            format: normalizeExportFormat(result?.format ?? format),
            exportedAt,
            fileName: String(result?.fileName || buildExportFileName(sessionId, exportedAt, format)),
            contentType: String(result?.contentType || resolveExportContentType(format)),
            content: String(result?.content || serializeSessionExport(format, exportedAt, session, messages, toolCalls)),
            session,
            messages,
            toolCalls
        };
    }

export function createExportResult(
        sessionId: string,
        format: AgentSessionExportFormat,
        exportedAt: number,
        session: Record<string, any>,
        messages: AgentMessage[],
        toolCalls: Array<Record<string, any>>
    ): AgentSessionExportResult {
        return {
            sessionId,
            format,
            exportedAt,
            fileName: buildExportFileName(sessionId, exportedAt, format),
            contentType: resolveExportContentType(format),
            content: serializeSessionExport(format, exportedAt, session, messages, toolCalls),
            session,
            messages,
            toolCalls
        };
    }

export function buildExportFileName(
        sessionId: string,
        exportedAt: number,
        format: AgentSessionExportFormat
    ): string {
        const ext = format === 'jsonl' ? 'jsonl' : format === 'html' ? 'html' : 'json';
        const stamp = new Date(exportedAt).toISOString().replace(/[:.]/g, '-');
        const safeSessionId = String(sessionId || 'session').replace(/[^a-zA-Z0-9._-]+/g, '-');
        return `agent-session-${safeSessionId}-${stamp}.${ext}`;
    }

export function resolveExportContentType(format: AgentSessionExportFormat): string {
        return format === 'jsonl'
            ? 'application/x-ndjson; charset=utf-8'
            : format === 'html'
                ? 'text/html; charset=utf-8'
                : 'application/json; charset=utf-8';
    }

export function serializeSessionExport(
        format: AgentSessionExportFormat,
        exportedAt: number,
        session: Record<string, any>,
        messages: AgentMessage[],
        toolCalls: Array<Record<string, any>>
    ): string {
        if (format === 'html') {
            return serializeSessionExportHtml(exportedAt, session, messages, toolCalls);
        }
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
            const toolCalls = Array.isArray(message?.metadata?.toolCalls)
                ? message.metadata.toolCalls
                : [];
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


/**
 * Standalone HTML transcript for sharing/reading in a browser.
 *
 * Everything is escaped and no scripts are emitted: tool output/model text is
 * untrusted, so the artifact must stay inert. Markdown is preserved verbatim
 * inside `<pre>` rather than parsed, which keeps the export dependency-free.
 */
export function serializeSessionExportHtml(
    exportedAt: number,
    session: Record<string, any>,
    messages: AgentMessage[],
    toolCalls: Array<Record<string, any>> = collectExportToolCalls(messages)
): string {
    const escape = (value: unknown): string => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const roleLabel = (role: string): string => {
        if (role === 'user') return 'You';
        if (role === 'assistant') return 'Assistant';
        if (role === 'tool') return 'Tool';
        if (role === 'system') return 'System';
        return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Message';
    };
    const title = String(session?.summary || session?.rootRequest || session?.id || 'Agent session').trim() || 'Agent session';
    const articles = (messages || []).map(message => {
        const role = String(message?.role || 'message');
        const calls = Array.isArray((message as any)?.metadata?.toolCalls) ? (message as any).metadata.toolCalls : [];
        const tools = calls.length
            ? `<ul class="tools">${calls.map((call: any) => `<li><code>${escape(call?.name || call?.id || 'tool')}</code></li>`).join('')}</ul>`
            : '';
        const time = message?.createdAt
            ? `<time>${escape(new Date(Number(message.createdAt)).toISOString())}</time>`
            : '';
        return `<article class="msg ${escape(role)}"><header><span class="role">${escape(roleLabel(role))}</span>${time}</header><pre>${escape(message?.content)}</pre>${tools}</article>`;
    }).join('\n');
    const stamp = new Date(exportedAt || Date.now()).toISOString();
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="tsdi-agent export">
<title>${escape(title)}</title>
<style>
:root { color-scheme: light dark; }
body { margin: 0 auto; max-width: 60rem; padding: 2rem 1.25rem 4rem; font: 15px/1.6 ui-sans-serif, system-ui, sans-serif; background: #0d1117; color: #c9d1d9; }
h1 { font-size: 1.35rem; margin: 0 0 .25rem; }
.meta { color: #8b949e; font-size: .85rem; margin-bottom: 2rem; }
.msg { border-left: 3px solid #30363d; padding: .25rem 0 .25rem 1rem; margin: 1.25rem 0; }
.msg.user { border-color: #1f6feb; }
.msg.assistant { border-color: #3fb950; }
.msg.tool, .msg.system { border-color: #8b6914; }
header { display: flex; gap: .75rem; align-items: baseline; color: #8b949e; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; }
.role { color: #c9d1d9; font-weight: 600; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: .4rem 0 0; font: inherit; }
.tools { margin: .5rem 0 0; padding-left: 1.1rem; color: #8b949e; font-size: .85rem; }
@media (prefers-color-scheme: light) {
  body { background: #ffffff; color: #24292f; }
  .msg { border-color: #d0d7de; }
  .meta, header, .tools { color: #6e7781; }
  .role { color: #24292f; }
}
</style>
</head>
<body>
<h1>${escape(title)}</h1>
<div class="meta">${escape(String(session?.id || ''))} · ${escape(String(messages?.length || 0))} messages · ${escape(String(toolCalls?.length || 0))} tool calls · exported ${escape(stamp)}</div>
${articles}
</body>
</html>
`;
}
