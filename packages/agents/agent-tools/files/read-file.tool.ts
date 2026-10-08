import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { createReadStream } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class ReadFileTool implements AgentTool {
    name = 'read_file';
    description = 'Read a text file from the configured workspace. Supports offset/limit for reading a line range of large files.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            offset: { type: 'integer', minimum: 1, description: '1-indexed line to start reading from (default 1).' },
            limit: { type: 'integer', minimum: 1, description: 'Maximum number of lines to read (defaults to the read limit).' }
        },
        required: ['path']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = {
        readOnly: true,
        timeoutMs: 15000,
        rateLimit: { maxCalls: 20, windowMs: 1000, scope: 'session' as const },
        redactOutput: true,
        auditEnabled: true
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.getRequestedPath(input);
        const offset = this.parsePositiveInt(input?.offset, 1, 'offset');
        const limit = this.parsePositiveInt(input?.limit, 0, 'limit');
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);
        const effectiveLimit = limit > 0 ? Math.min(limit, policy.maxReadLines) : policy.maxReadLines;
        const range = await this.readLineRange(absolutePath, offset, effectiveLimit, policy.maxReadBytes);
        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            content: range.content,
            truncated: range.truncated,
            offset,
            ...(range.totalLines != null ? { totalLines: range.totalLines } : {})
        };
    }

    private getRequestedPath(input: any): string {
        if (!input || typeof input.path !== 'string') {
            throw new Error('Invalid read_file input: path must be a string.');
        }
        return input.path;
    }

    private parsePositiveInt(value: any, fallback: number, field: string): number {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1) {
            throw new Error(`Invalid read_file input: ${field} must be a positive integer.`);
        }
        return parsed;
    }

    /**
     * Stream the file and return the requested 1-indexed line range, stopping as
     * soon as the range is satisfied (a small `limit` never reads a huge file to
     * the end). `truncated` is true when more content follows the range.
     */
    private async readLineRange(
        filePath: string,
        offset: number,
        limit: number,
        maxBytes: number
    ): Promise<{ content: string; truncated: boolean; totalLines?: number }> {
        const stream = createReadStream(filePath, { highWaterMark: 64 * 1024 });
        const collected: string[] = [];
        let buffer = '';
        let lineNumber = 0;
        let bytes = 0;
        let truncated = false;
        let stopped = false;
        try {
            for await (const chunk of stream) {
                buffer += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : Buffer.from(chunk).toString('utf8');
                let index = buffer.indexOf('\n');
                while (index >= 0) {
                    const rawLine = buffer.slice(0, index);
                    buffer = buffer.slice(index + 1);
                    lineNumber += 1;
                    if (lineNumber >= offset) {
                        if (collected.length >= limit) {
                            truncated = true;
                            stopped = true;
                            break;
                        }
                        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
                        const size = Buffer.byteLength(line, 'utf8') + (collected.length ? 1 : 0);
                        if (bytes + size > maxBytes && collected.length) {
                            truncated = true;
                            stopped = true;
                            break;
                        }
                        collected.push(line);
                        bytes += size;
                    }
                    index = buffer.indexOf('\n');
                }
                if (stopped) {
                    break;
                }
            }
            if (!stopped && buffer.length) {
                lineNumber += 1;
                if (lineNumber >= offset && collected.length < limit) {
                    collected.push(buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer);
                }
            }
        } finally {
            stream.destroy();
        }
        return {
            content: collected.join('\n'),
            truncated,
            ...(stopped ? {} : { totalLines: lineNumber })
        };
    }
}
