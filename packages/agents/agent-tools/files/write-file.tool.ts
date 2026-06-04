import * as path from 'path';
import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';

@Injectable()
export class WriteFileTool implements AgentTool {
    name = 'write_file';
    description = 'Write a text file inside the configured workspace.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            content: { type: 'string' }
        },
        required: ['path', 'content']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        timeoutMs: 30000,
        retryPolicy: { maxRetries: 1, delayMs: 50 },
        rateLimit: { maxCalls: 5, windowMs: 1000, scope: 'session' as const },
        redactOutput: true,
        auditEnabled: true
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.requirePath(input?.path);
        const content = this.requireContent(input?.content);
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir, { allowMissingPath: true });

        const existed = await this.existsAsFile(absolutePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, content, 'utf8');

        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            bytesWritten: Buffer.byteLength(content, 'utf8'),
            created: !existed,
            overwritten: existed
        };
    }

    private requirePath(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid write_file input: path must be a non-empty string.');
        }
        return value;
    }

    private requireContent(value: unknown): string {
        if (typeof value !== 'string') {
            throw new Error('Invalid write_file input: content must be a string.');
        }
        return value;
    }

    private async existsAsFile(filePath: string): Promise<boolean> {
        try {
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                throw new Error(`Cannot write file '${filePath}': path is a directory.`);
            }
            return true;
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }
}
