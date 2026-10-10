import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { createReadStream } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';
import { recordFileRead } from './file-access-registry';

const MAX_LINE_LENGTH = 2000;

function truncateLine(line: string): string {
    return line.length > MAX_LINE_LENGTH
        ? `${line.slice(0, MAX_LINE_LENGTH)}... (line truncated to ${MAX_LINE_LENGTH} chars)`
        : line;
}

@Injectable()
export class ReadFileTool implements AgentTool {
    name = 'read_file';
    description = 'Read a text file from the configured workspace. Each returned line is prefixed with its 1-indexed file line number as `<line>: <content>`. Supports offset/limit for reading a line range of large files.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            offset: { type: 'integer', minimum: 1, description: '1-indexed line to start reading from (default 1).' },
            limit: { type: 'integer', minimum: 1, description: 'Maximum number of lines to read. Defaults to the configured read limit (400); may be raised up to the configured ceiling (2000) to read a large file in fewer calls.' }
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

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const requestedPath = this.getRequestedPath(input);
        const offset = this.parsePositiveInt(input?.offset, 1, 'offset');
        const limit = this.parsePositiveInt(input?.limit, 0, 'limit');
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);
        // No explicit limit -> default window; an explicit limit may be raised
        // up to the ceiling but never below the default. The byte budget inside
        // readLineRange still bounds the returned size (opencode-style).
        const ceiling = Math.max(policy.maxReadLines, policy.maxReadLinesLimit);
        const effectiveLimit = limit > 0 ? Math.min(limit, ceiling) : policy.maxReadLines;
        const range = await this.readLineRange(absolutePath, offset, effectiveLimit, policy.maxReadBytes);
        const content = range.content
            ? range.content.split('\n').map((line, index) => `${offset + index}: ${line}`).join('\n')
            : '';
        const relativePath = toRelativeWorkspacePath(absolutePath, policy.rootDir);
        if (policy.requireReadBeforeWrite) {
            recordFileRead(context?.sessionId ?? '', relativePath);
        }
        return {
            path: relativePath,
            content,
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
                        collected.push(truncateLine(line));
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
                    const line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
                    collected.push(truncateLine(line));
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
