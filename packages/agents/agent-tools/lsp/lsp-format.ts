import { promises as fs } from 'fs';
import * as path from 'path';
import { AgentTool, AgentToolContext, FileSnapshot } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { resolveLspManager, toFileUri, unavailable } from './lsp.tools';
import { LspTextEdit } from './types';

/**
 * Apply LSP TextEdits to a document.
 *
 * Positions are UTF-16 based (the LSP default) and JS string indices are too,
 * so line offsets can be computed directly. Edits are applied from the end of
 * the document backwards: replacing a later range cannot invalidate the
 * offsets of an earlier one.
 */
export function applyLspTextEdits(text: string, edits: LspTextEdit[]): string {
    if (!edits.length) {
        return text;
    }
    const lines = text.split('\n');
    const offsets: number[] = new Array(lines.length);
    let offset = 0;
    for (let index = 0; index < lines.length; index++) {
        offsets[index] = offset;
        offset += lines[index].length + 1;
    }
    const toOffset = (position: { line?: number; character?: number } | undefined): number => {
        const line = Math.max(0, Math.min(lines.length - 1, Math.floor(Number(position?.line) || 0)));
        const character = Math.max(0, Math.floor(Number(position?.character) || 0));
        return Math.min(text.length, offsets[line] + character);
    };
    const ordered = edits
        .map(edit => ({
            start: toOffset(edit.range?.start),
            end: toOffset(edit.range?.end),
            newText: edit.newText
        }))
        .filter(edit => edit.end >= edit.start)
        .sort((left, right) => right.start - left.start);
    let result = text;
    for (const edit of ordered) {
        result = result.slice(0, edit.start) + edit.newText + result.slice(edit.end);
    }
    return result;
}

function resolveFileInput(input: any, workspace?: string): string | { error: string } {
    const requested = typeof input?.filePath === 'string' && input.filePath.trim() ? input.filePath.trim() : '';
    if (!requested) {
        return { error: 'Invalid input: filePath is required.' };
    }
    if (path.isAbsolute(requested) || !workspace) {
        return requested;
    }
    return path.join(workspace, requested);
}

/**
 * `lsp_format` — request whole-document formatting from the configured LSP
 * server and optionally write the result back.
 *
 * Mutating by default (`write: true`), so it is workspace-trust gated and
 * carries a file snapshot when invoked inside a turn.
 */
@Injectable()
export class LspFormatTool implements AgentTool {
    name = 'lsp_format';
    description = 'Format a file with the configured Language Server Protocol server and write the result (set write=false to preview only).';
    inputSchema = {
        type: 'object',
        properties: {
            filePath: { type: 'string' },
            write: { type: 'boolean', description: 'Write the formatted content back; defaults to true.' },
            tabSize: { type: 'number' },
            insertSpaces: { type: 'boolean' }
        },
        required: ['filePath']
    };
    toolset = 'lsp';
    source = 'local';
    execution = {
        readOnly: false,
        timeoutMs: 30000,
        retryPolicy: { maxRetries: 0, delayMs: 0 }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS) private options?: AgentToolsOptions
    ) {
    }

    async captureFileSnapshot(input: any, context: AgentToolContext): Promise<FileSnapshot | null> {
        const resolved = resolveFileInput(input, context?.workspace);
        if (typeof resolved === 'object') {
            return null;
        }
        try {
            return {
                filePath: resolved,
                before: await fs.readFile(resolved, 'utf8'),
                after: null,
                timestamp: Date.now(),
                toolName: this.name
            };
        } catch {
            return null;
        }
    }

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const resolved = resolveFileInput(input, context?.workspace);
        if (typeof resolved === 'object') {
            throw new Error(resolved.error);
        }
        const filePath = resolved;
        const manager = resolveLspManager(this.options);
        const server = await manager.clientFor(filePath);
        if (!server) {
            return unavailable(manager, manager.extensionForPath(filePath));
        }
        const capabilities = await server.client.ensureInitialized();
        if (!capabilities.documentFormattingProvider) {
            return {
                available: false,
                filePath,
                message: `The LSP server for '${server.extension}' files does not support document formatting.`
            };
        }
        let before: string;
        try {
            before = await fs.readFile(filePath, 'utf8');
        } catch (error: any) {
            throw new Error(`Cannot read '${filePath}': ${error?.message || String(error)}`);
        }
        const uri = toFileUri(filePath);
        await server.client.didChange(uri, before);
        const edits = await server.client.formatDocument(uri, {
            tabSize: Number(input?.tabSize) || 4,
            insertSpaces: input?.insertSpaces !== false
        });
        const after = applyLspTextEdits(before, edits);
        const changed = after !== before;
        const write = input?.write !== false;
        if (write && changed) {
            await fs.writeFile(filePath, after, 'utf8');
        }
        return {
            available: true,
            filePath,
            changed,
            editCount: edits.length,
            written: write && changed
        };
    }
}
