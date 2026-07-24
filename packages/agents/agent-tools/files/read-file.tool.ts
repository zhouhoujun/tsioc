import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { createReadStream, promises as fs } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath, truncateTextByLinesAndBytes } from './path-policy';

@Injectable()
export class ReadFileTool implements AgentTool {
    name = 'read_file';
    description = 'Read a text file from the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' }
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
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);
        const content = await this.readWithinLimits(absolutePath, policy.maxReadBytes, policy.maxReadLines);
        const truncated = truncateTextByLinesAndBytes(content, policy.maxReadBytes, policy.maxReadLines);
        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            content: truncated.content,
            truncated: truncated.truncated
        };
    }

    private getRequestedPath(input: any): string {
        if (!input || typeof input.path !== 'string') {
            throw new Error('Invalid read_file input: path must be a string.');
        }
        return input.path;
    }

    private async readWithinLimits(filePath: string, maxBytes: number, maxLines: number): Promise<string> {
        const stat = await fs.stat(filePath);
        const byteLimit = Math.max(1, maxBytes);
        const lineLimit = Math.max(1, maxLines);
        const captureLimit = byteLimit + 4;
        const chunkSize = Math.min(Math.max(byteLimit, 4096), 64 * 1024);
        const chunks: Buffer[] = [];
        let capturedBytes = 0;
        let newlineCount = 0;

        const stream = createReadStream(filePath, { highWaterMark: chunkSize });
        try {
            for await (const chunk of stream) {
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                const remaining = captureLimit - capturedBytes;
                if (remaining <= 0) {
                    break;
                }
                const slice = buffer.length > remaining
                    ? buffer.subarray(0, remaining)
                    : buffer;
                chunks.push(slice);
                capturedBytes += slice.length;
                newlineCount += this.countNewlines(slice);
                if (newlineCount > lineLimit || capturedBytes >= captureLimit) {
                    break;
                }
            }
        } finally {
            stream.destroy();
        }

        if (stat.size <= capturedBytes && newlineCount <= lineLimit) {
            return Buffer.concat(chunks, capturedBytes).toString('utf8');
        }

        return Buffer.concat(chunks, capturedBytes).toString('utf8');
    }

    private countNewlines(buffer: Buffer): number {
        let count = 0;
        for (let index = 0; index < buffer.length; index++) {
            if (buffer[index] === 0x0a) {
                count += 1;
            }
        }
        return count;
    }
}
