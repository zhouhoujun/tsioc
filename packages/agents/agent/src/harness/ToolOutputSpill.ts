import { FileAdapter } from '@tsdi/common';

export interface ToolOutputSpillContext {
    workspace?: string;
    toolCallId?: string;
    toolName?: string;
    dir?: string;
    enabled?: boolean;
}

export const DEFAULT_TOOL_OUTPUT_SPILL_DIR = '.tsdi-agent/tool-output';
export const DEFAULT_TOOL_OUTPUT_SPILL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const SPILL_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

let lastCleanupAt = 0;

export interface ToolOutputSpillCleanupOptions {
    dir?: string;
    retentionMs?: number;
    now?: number;
}

function sanitizeSegment(value: string): string {
    return String(value || 'tool').replace(/[^A-Za-z0-9_.-]/g, '_') || 'tool';
}

export async function cleanupToolOutputSpill(
    fileAdapter: FileAdapter | null | undefined,
    workspace?: string,
    options: ToolOutputSpillCleanupOptions = {}
): Promise<number> {
    if (!fileAdapter?.list || !fileAdapter?.remove || !workspace) {
        return 0;
    }
    const dirName = options.dir || DEFAULT_TOOL_OUTPUT_SPILL_DIR;
    const retentionMs = options.retentionMs ?? DEFAULT_TOOL_OUTPUT_SPILL_RETENTION_MS;
    const now = options.now ?? Date.now();
    let removed = 0;
    try {
        const entries = await fileAdapter.list(fileAdapter.join(workspace, dirName));
        for (const entry of entries) {
            if (entry.kind !== 'file') {
                continue;
            }
            const stat = await fileAdapter.stat(entry.path).catch(() => null) as { mtimeMs?: number } | null;
            const mtime = Number(stat?.mtimeMs || 0);
            if (mtime && now - mtime > retentionMs) {
                await fileAdapter.remove(entry.path, { force: true });
                removed += 1;
            }
        }
    } catch {
        return removed;
    }
    return removed;
}

/**
 * Return tool output made safe for the context window. Oversized output is
 * written in full to the workspace spill directory and replaced with a head
 * preview plus a hint pointing at the saved file (opencode-style truncation), so
 * the model can read the rest on demand. Falls back to inline truncation when no
 * workspace/file adapter is available or the write fails.
 */
export async function spillToolOutput(
    fileAdapter: FileAdapter | null | undefined,
    content: string,
    maxChars: number,
    context: ToolOutputSpillContext = {}
): Promise<string> {
    if (!Number.isFinite(maxChars) || maxChars <= 0 || content.length <= maxChars) {
        return content;
    }
    const preview = content.slice(0, maxChars);
    if (context.enabled === false || !fileAdapter?.writeText || !fileAdapter?.mkdir || !context.workspace) {
        return `${preview}...[truncated]`;
    }
    const dirName = context.dir || DEFAULT_TOOL_OUTPUT_SPILL_DIR;
    try {
        const relPath = fileAdapter.join(dirName, `${sanitizeSegment(context.toolCallId || context.toolName || 'tool')}.txt`);
        await fileAdapter.mkdir(fileAdapter.join(context.workspace, dirName), { recursive: true });
        await fileAdapter.writeText(fileAdapter.join(context.workspace, relPath), content);
        const now = Date.now();
        if (now - lastCleanupAt > SPILL_CLEANUP_INTERVAL_MS) {
            lastCleanupAt = now;
            await cleanupToolOutputSpill(fileAdapter, context.workspace, { dir: dirName, now }).catch(() => 0);
        }
        const removed = content.length - maxChars;
        return `${preview}\n\n[Output truncated: ${removed} more characters. Full output saved to "${relPath}". Use read_file with path="${relPath}" to read it in full.]`;
    } catch {
        return `${preview}...[truncated]`;
    }
}
