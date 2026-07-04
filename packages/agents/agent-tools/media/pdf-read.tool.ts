import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from '../files/path-policy';
import { PdfReadAdapter } from './types';

const DEFAULT_MAX_PAGES_WITHOUT_RANGE = 10;
const MAX_PAGE_SPAN = 20;

@Injectable()
export class PdfReadTool implements AgentTool {
    name = 'pdf_read';
    description = 'Read extracted text from a PDF file in the workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            pages: { type: 'string' }
        },
        required: ['path']
    };
    toolset = 'media';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS)
        private options?: AgentToolsOptions,
        @Optional() @Inject(PdfReadAdapter)
        private adapter?: PdfReadAdapter | null
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const adapter = this.adapter ?? this.options?.pdf?.adapter;
        if (!adapter) {
            throw new Error('pdf_read requires a configured PDF read adapter.');
        }
        const requestedPath = this.getRequestedPath(input);
        const pageSpec = this.resolvePageSpec(input?.pages);
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);
        const stat = await fs.stat(absolutePath);
        if (!stat.isFile()) {
            throw new Error('Invalid PDF file: path must reference a regular file.');
        }
        if (!stat.size) {
            throw new Error('Invalid PDF file: file is empty.');
        }
        const header = Buffer.alloc(Math.min(stat.size, 5));
        const handle = await fs.open(absolutePath, 'r');
        try {
            const { bytesRead } = await handle.read(header, 0, header.length, 0);
            if (header.subarray(0, bytesRead).toString('ascii') !== '%PDF-') {
                throw new Error('Invalid PDF file: expected %PDF header.');
            }
        } finally {
            await handle.close();
        }

        if (!pageSpec) {
            const pageCount = await adapter.getPageCount(absolutePath);
            if (pageCount > DEFAULT_MAX_PAGES_WITHOUT_RANGE) {
                throw new Error(`pdf_read requires pages for PDFs longer than ${DEFAULT_MAX_PAGES_WITHOUT_RANGE} pages.`);
            }
        }

        const result = await adapter.read(absolutePath, pageSpec ? { pages: pageSpec.pages } : undefined);
        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            pageCount: result.pageCount,
            pages: result.pages.map(page => ({ pageNumber: page.pageNumber, text: page.text }))
        };
    }

    private getRequestedPath(input: any): string {
        if (!input || typeof input.path !== 'string') {
            throw new Error('Invalid pdf_read input: path must be a string.');
        }
        return input.path;
    }

    private resolvePageSpec(value: unknown): { pages: number[]; } | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid pdf_read input: pages must be a non-empty string.');
        }
        const trimmed = value.trim();
        const rangeMatch = trimmed.match(/^(\d+)(?:-(\d+))?$/);
        if (!rangeMatch) {
            throw new Error('Invalid pdf_read input: pages must be like "1" or "2-4".');
        }
        const start = Number(rangeMatch[1]);
        const end = rangeMatch[2] ? Number(rangeMatch[2]) : start;
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1 || end < start) {
            throw new Error('Invalid pdf_read input: pages must be a positive ascending range.');
        }
        if ((end - start + 1) > MAX_PAGE_SPAN) {
            throw new Error(`Invalid pdf_read input: pages range must not exceed ${MAX_PAGE_SPAN} pages.`);
        }
        return {
            pages: Array.from({ length: end - start + 1 }, (_, index) => start + index)
        };
    }
}
