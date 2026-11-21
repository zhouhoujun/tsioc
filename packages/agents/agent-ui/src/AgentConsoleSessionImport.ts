import { formatAgentUiNotice } from './agent-ui.i18n';
import { resolveFileAdapter, type ExportHandlerContext } from './AgentConsoleExportHandlers';

// ── Import command ───────────────────────────────────────────────────────────

const IMPORT_MAX_MESSAGES = 2000;

/**
 * Parse `/export json` (object) and `/export jsonl` (line-delimited) payloads.
 * Returns undefined when the file is not a transcript export.
 */
export function parseImportedSession(text: string): { messages: Array<Record<string, any>>; title?: string; summary?: string } | undefined {
    const raw = String(text || '').trim();
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw);
        const messages = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.messages) ? parsed.messages : undefined;
        if (!messages?.length) {
            return undefined;
        }
        return {
            messages: messages.slice(0, IMPORT_MAX_MESSAGES),
            title: typeof parsed?.session?.title === 'string' ? parsed.session.title : undefined,
            summary: typeof parsed?.session?.summary === 'string' ? parsed.session.summary : undefined
        };
    } catch {
        // Not a single JSON document: try JSONL.
    }
    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) {
        return undefined;
    }
    const messages: Array<Record<string, any>> = [];
    let session: Record<string, any> | undefined;
    for (const line of lines) {
        let entry: any;
        try {
            entry = JSON.parse(line);
        } catch {
            return undefined;
        }
        if (entry?.type === 'session') {
            session = entry.session;
        } else if (entry?.type === 'message' && entry.message) {
            messages.push(entry.message);
        } else if (entry?.role) {
            messages.push(entry);
        }
    }
    if (!messages.length) {
        return undefined;
    }
    return {
        messages: messages.slice(0, IMPORT_MAX_MESSAGES),
        title: typeof session?.title === 'string' ? session.title : undefined,
        summary: typeof session?.summary === 'string' ? session.summary : undefined
    };
}

export async function runImportCommand(ctx: ExportHandlerContext, args: string): Promise<boolean> {
    const requested = String(args || '').trim();
    if (!requested) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'importUsage'));
        return true;
    }
    const fileAdapter = resolveFileAdapter(ctx);
    if (!fileAdapter) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'importUnavailable'));
        return true;
    }
    const targetPath = fileAdapter.isAbsolute(requested)
        ? fileAdapter.normalize(requested)
        : fileAdapter.resolve(String(ctx.workspace || '.'), requested);
    let text: string;
    try {
        text = await fileAdapter.readText(targetPath, 'utf-8');
    } catch (error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'failedImportSession', {
            error: error instanceof Error ? error.message : String(error)
        }));
        return true;
    }
    const parsed = parseImportedSession(text);
    if (!parsed) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'importInvalidExport', { path: targetPath }));
        return true;
    }
    if (!ctx.sessionService.importSession) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'importUnavailable'));
        return true;
    }
    try {
        const result = await ctx.sessionService.importSession(parsed.messages, {
            ...(parsed.title ? { title: parsed.title } : {}),
            ...(parsed.summary ? { summary: parsed.summary } : {})
        });
        await ctx.refreshSessions?.();
        await ctx.openSession?.(result.sessionId, { background: false });
        ctx.notify(formatAgentUiNotice(ctx.translator, 'importedSession', {
            sessionId: result.sessionId,
            count: result.messageCount
        }));
    } catch (error) {
        ctx.notify(formatAgentUiNotice(ctx.translator, 'failedImportSession', {
            error: error instanceof Error ? error.message : String(error)
        }));
    }
    return true;
}

