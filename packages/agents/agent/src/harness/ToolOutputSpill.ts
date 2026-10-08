import { FileAdapter } from '@tsdi/common';

export interface ToolOutputSpillContext {
    workspace?: string;
    toolCallId?: string;
    toolName?: string;
    dir?: string;
    enabled?: boolean;
}

export const DEFAULT_TOOL_OUTPUT_SPILL_DIR = '.tsdi-agent/tool-output';

function sanitizeSegment(value: string): string {
    return String(value || 'tool').replace(/[^A-Za-z0-9_.-]/g, '_') || 'tool';
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
        const removed = content.length - maxChars;
        return `${preview}\n\n[Output truncated: ${removed} more characters. Full output saved to "${relPath}". Use read_file with path="${relPath}" to read it in full.]`;
    } catch {
        return `${preview}...[truncated]`;
    }
}
