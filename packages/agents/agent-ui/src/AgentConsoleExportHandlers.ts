import { FileAdapter } from '@tsdi/common';
import type { AgentTurnMessageInput } from '@tsdi/agent';
import type {
    AgentSessionExportFormat,
    AgentSessionExportResult,
} from './AgentConsoleSessionService';
import type {
    AgentConsolePendingAttachment,
} from './AgentConsoleSessionState';

// ── Export / attachment context ──────────────────────────────────────────────

export interface ExportHandlerContext {
    state: {
        sessionId: string;
        pendingAttachments: AgentConsolePendingAttachment[];
        openSelectMenu: (title: string, options: Array<{ label: string; value: string; description?: string; detail?: string }>, initialIndex?: number, footer?: string) => void;
        clearPendingAttachments: () => void;
        setPendingAttachments: (attachments: AgentConsolePendingAttachment[]) => void;
    };
    sessionService: {
        exportSession(sessionId: string, options: { format: AgentSessionExportFormat }): Promise<AgentSessionExportResult>;
    };
    app: {
        get(token: any, notFoundValue?: any): any;
    };
    workspace: string;
    notify: (msg: string, duration?: number) => void;
}

// ── Export command ───────────────────────────────────────────────────────────

export async function runExportCommand(
    ctx: ExportHandlerContext,
    args: string
): Promise<boolean> {
    if (!ctx.sessionService) {
        ctx.notify('Session export is unavailable without session service.');
        return true;
    }
    const parsed = parseExportArgs(args);
    const sessionId = parsed.sessionId || ctx.state.sessionId;
    if (!sessionId) {
        ctx.notify('No session selected. Run /export [json|jsonl] [sessionId] [path].');
        return true;
    }
    const result = await ctx.sessionService.exportSession(sessionId, { format: parsed.format });
    const targetPath = await tryWriteSessionExport(ctx, result, parsed.path);
    if (targetPath) {
        ctx.notify(`Exported session '${sessionId}' to ${targetPath}.`);
        return true;
    }
    previewSessionExport(ctx, result);
    ctx.notify(`Export preview ready for session '${sessionId}' (${result.format.toUpperCase()}).`);
    return true;
}

export function parseExportArgs(
    args: string
): { format: AgentSessionExportFormat; sessionId?: string; path?: string } {
    const tokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    let format: AgentSessionExportFormat = 'json';
    if (tokens[0] && /^(json|jsonl)$/i.test(tokens[0])) {
        format = tokens.shift()!.toLowerCase() as AgentSessionExportFormat;
    }
    if (!tokens.length) {
        return { format };
    }
    if (tokens.length === 1) {
        const token = tokens[0];
        return looksLikeExportPath(token)
            ? { format, path: token }
            : { format, sessionId: token };
    }
    return {
        format,
        sessionId: tokens.shift(),
        path: tokens.join(' ')
    };
}

export function looksLikeExportPath(value: string): boolean {
    const token = String(value || '').trim();
    return !!token && (
        /[\\/]/.test(token)
        || token.startsWith('.')
        || token.endsWith('.json')
        || token.endsWith('.jsonl')
    );
}

export async function tryWriteSessionExport(
    ctx: ExportHandlerContext,
    result: AgentSessionExportResult,
    requestedPath?: string
): Promise<string | undefined> {
    const fileAdapter = resolveFileAdapter(ctx);
    if (!fileAdapter) {
        return undefined;
    }
    const targetPath = resolveExportTargetPath(fileAdapter, ctx.workspace, result, requestedPath);
    try {
        const dirname = resolvePathDirectory(targetPath, fileAdapter);
        if (dirname) {
            await fileAdapter.mkdir(dirname, { recursive: true });
        }
        await fileAdapter.writeText(targetPath, result.content, 'utf-8');
        return targetPath;
    } catch {
        return undefined;
    }
}

export function previewSessionExport(
    ctx: ExportHandlerContext,
    result: AgentSessionExportResult
): void {
    const messageCount = Number(result.session?.messageCount ?? result.messages.length);
    const toolCallCount = Number(result.session?.toolCallCount ?? result.toolCalls.length);
    ctx.state.openSelectMenu(
        `Session export (${result.format})`,
        [{
            label: result.fileName,
            value: result.fileName,
            description: `${messageCount} message${messageCount === 1 ? '' : 's'} · ${toolCallCount} tool call${toolCallCount === 1 ? '' : 's'}`,
            detail: result.content
        }],
        0,
        'Read-only export preview. Press Esc to close.'
    );
}

export function resolveFileAdapter(ctx: ExportHandlerContext): FileAdapter | null {
    return ctx.app?.get(FileAdapter, null) as FileAdapter | null;
}

export function resolveExportTargetPath(
    fileAdapter: FileAdapter,
    workspace: string,
    result: AgentSessionExportResult,
    requestedPath?: string
): string {
    const trimmed = String(requestedPath || '').trim();
    if (trimmed) {
        if (fileAdapter.isAbsolute(trimmed)) {
            return fileAdapter.normalize(trimmed);
        }
        const ws = String(workspace || '').trim();
        return ws
            ? fileAdapter.resolve(ws, trimmed)
            : fileAdapter.normalize(trimmed);
    }
    const ws = String(workspace || '').trim();
    return ws
        ? fileAdapter.join(ws, '.tsdi-agent', 'exports', result.fileName)
        : fileAdapter.join('.tsdi-agent', 'exports', result.fileName);
}

export function resolvePathDirectory(targetPath: string, fileAdapter: FileAdapter): string {
    const normalized = fileAdapter.normalize(targetPath).replace(/[\\/]+$/, '');
    const slashIndex = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    if (slashIndex < 0) {
        return '.';
    }
    if (/^[a-zA-Z]:[\\/]/.test(normalized) && slashIndex === 2) {
        return normalized.slice(0, 3);
    }
    if (slashIndex === 0) {
        return normalized.slice(0, 1);
    }
    return normalized.slice(0, slashIndex);
}

// ── Attachment command ───────────────────────────────────────────────────────

export function resolveAttachmentTargetPath(
    targetPath: string,
    workspace: string,
    fileAdapter: FileAdapter
): string {
    const trimmed = String(targetPath || '').trim();
    if (!trimmed) {
        throw new Error('Usage: /attach <path>');
    }
    if (fileAdapter.isAbsolute(trimmed)) {
        return fileAdapter.normalize(trimmed);
    }
    const ws = String(workspace || '').trim();
    return ws
        ? fileAdapter.resolve(ws, trimmed)
        : fileAdapter.normalize(trimmed);
}

export function describePendingAttachments(
    attachments: AgentConsolePendingAttachment[]
): string {
    if (!attachments.length) {
        return 'No pending attachments.';
    }
    return `Pending attachments: ${attachments.map(item => item.name).join(', ')}`;
}

export function buildTurnMessageInput(
    prompt: string,
    attachments: AgentConsolePendingAttachment[]
): AgentTurnMessageInput | undefined {
    if (!attachments.length) {
        return undefined;
    }
    return {
        content: prompt,
        parts: [
            ...(prompt ? [{ type: 'text', text: prompt } as const] : []),
            ...attachments.map(attachment => attachment.kind === 'file'
                ? ({
                    type: 'file' as const,
                    dataUrl: attachment.dataUrl || '',
                    mediaType: attachment.mediaType || 'application/octet-stream',
                    name: attachment.name
                })
                : ({
                    type: 'image' as const,
                    imageUrl: attachment.imageUrl || '',
                    mediaType: attachment.mediaType,
                    name: attachment.name
                })
            )
        ]
    };
}

export async function runAttachCommand(
    ctx: ExportHandlerContext,
    args: string
): Promise<boolean> {
    const trimmed = String(args || '').trim();
    if (!trimmed) {
        ctx.notify(describePendingAttachments(ctx.state.pendingAttachments));
        return true;
    }
    if (/^(clear|reset)$/i.test(trimmed)) {
        ctx.state.clearPendingAttachments();
        ctx.notify('Cleared pending attachments.');
        return true;
    }
    const fileAdapter = resolveFileAdapter(ctx);
    if (!fileAdapter) {
        ctx.notify('Attach is unavailable without a file adapter.');
        return true;
    }
    try {
        const attachment = await loadPendingAttachment(trimmed, ctx.workspace, fileAdapter);
        ctx.state.setPendingAttachments([
            ...ctx.state.pendingAttachments.filter(item => item.path !== attachment.path),
            attachment
        ]);
        ctx.notify(`Attached: ${attachment.name}`);
        return true;
    } catch (error) {
        ctx.notify(`Attach failed: ${error instanceof Error ? error.message : String(error)}`);
        return true;
    }
}

export async function loadPendingAttachment(
    targetPath: string,
    workspace: string,
    fileAdapter: FileAdapter
): Promise<AgentConsolePendingAttachment> {
    const absolutePath = resolveAttachmentTargetPath(targetPath, workspace, fileAdapter);
    const imageMediaType = resolveImageMediaType(absolutePath);
    if (imageMediaType) {
        const bytes = await readFileBytes(absolutePath, fileAdapter);
        return {
            id: `attachment-${Date.now()}-${Math.random()}`,
            kind: 'image',
            path: absolutePath,
            name: absolutePath.split(/[\\/]/).pop() || absolutePath,
            mediaType: imageMediaType,
            imageUrl: `data:${imageMediaType};base64,${encodeBase64(bytes)}`
        };
    }
    const docMediaType = resolveDocumentMediaType(absolutePath);
    if (docMediaType) {
        const bytes = await readFileBytes(absolutePath, fileAdapter);
        return {
            id: `attachment-${Date.now()}-${Math.random()}`,
            kind: 'file',
            path: absolutePath,
            name: absolutePath.split(/[\\/]/).pop() || absolutePath,
            mediaType: docMediaType,
            dataUrl: `data:${docMediaType};base64,${encodeBase64(bytes)}`
        };
    }
    throw new Error(`Unsupported attachment format for '${targetPath}'.`);
}

export function resolveImageMediaType(filePath: string): string | undefined {
    const normalized = String(filePath || '').trim().toLowerCase();
    for (const ext of Object.keys(IMAGE_MIME_TYPES)) {
        if (normalized.endsWith(ext)) {
            return IMAGE_MIME_TYPES[ext];
        }
    }
    return undefined;
}

export function resolveDocumentMediaType(filePath: string): string | undefined {
    const normalized = String(filePath || '').trim().toLowerCase();
    for (const ext of Object.keys(DOCUMENT_MIME_TYPES)) {
        if (normalized.endsWith(ext)) {
            return DOCUMENT_MIME_TYPES[ext];
        }
    }
    return undefined;
}

export function resolveAnyMediaType(filePath: string): string | undefined {
    return resolveImageMediaType(filePath) || resolveDocumentMediaType(filePath);
}

// ── Binary helpers ───────────────────────────────────────────────────────────

export async function readFileBytes(
    targetPath: string,
    fileAdapter: FileAdapter
): Promise<Uint8Array> {
    const readable = fileAdapter.read(targetPath) as any;
    if (readable && typeof readable[Symbol.asyncIterator] === 'function') {
        const chunks: Uint8Array[] = [];
        let total = 0;
        for await (const chunk of readable) {
            const bytes = await normalizeBinaryChunk(chunk);
            if (!bytes.length) {
                continue;
            }
            chunks.push(bytes);
            total += bytes.length;
        }
        return concatUint8Arrays(chunks, total);
    }
    return await new Promise<Uint8Array>((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        let total = 0;
        let finished = false;
        const pending: Array<Promise<void>> = [];
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            void Promise.all(pending)
                .then(() => resolve(concatUint8Arrays(chunks, total)))
                .catch(reject);
        };
        const fail = (error: Error) => {
            if (finished) {
                return;
            }
            finished = true;
            reject(error);
        };
        readable?.on?.('data', (chunk: any) => {
            pending.push(normalizeBinaryChunk(chunk)
                .then(bytes => {
                    if (!bytes.length) {
                        return;
                    }
                    chunks.push(bytes);
                    total += bytes.length;
                })
                .catch(fail));
        });
        readable?.once?.('end', finish);
        readable?.once?.('close', finish);
        readable?.once?.('error', fail);
    });
}

export async function normalizeBinaryChunk(chunk: any): Promise<Uint8Array> {
    if (!chunk) {
        return new Uint8Array(0);
    }
    if (chunk instanceof Uint8Array) {
        return chunk;
    }
    if (typeof ArrayBuffer !== 'undefined' && chunk instanceof ArrayBuffer) {
        return new Uint8Array(chunk);
    }
    if (typeof chunk?.arrayBuffer === 'function') {
        return new Uint8Array(await chunk.arrayBuffer());
    }
    if (typeof chunk === 'string') {
        return new TextEncoder().encode(chunk);
    }
    if (Array.isArray(chunk)) {
        return Uint8Array.from(chunk);
    }
    return new Uint8Array(0);
}

export function concatUint8Arrays(chunks: Uint8Array[], total: number): Uint8Array {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes;
}

export function encodeBase64(bytes: Uint8Array): string {
    const runtimeBuffer = (globalThis as { Buffer?: { from(value: Uint8Array): { toString(encoding: string): string } } }).Buffer;
    if (runtimeBuffer) return runtimeBuffer.from(bytes).toString('base64');
    if (typeof globalThis.btoa === 'function') {
        let binary = '';
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
            const slice = bytes.subarray(index, index + chunkSize);
            binary += String.fromCharCode(...Array.from(slice));
        }
        return globalThis.btoa(binary);
    }
    throw new Error('Base64 encoding is unavailable in this environment.');
}

// ── MIME type maps ───────────────────────────────────────────────────────────

const IMAGE_MIME_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
};

const DOCUMENT_MIME_TYPES: Record<string, string> = {
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.jsonl': 'application/x-ndjson',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.md': 'text/markdown',
    '.pdf': 'application/pdf',
};
