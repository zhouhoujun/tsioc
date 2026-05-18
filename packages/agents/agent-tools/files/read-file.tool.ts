import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { promises as fs } from 'fs';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath, truncateTextByLinesAndBytes } from './path-policy';

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
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.getRequestedPath(input);
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        const content = await fs.readFile(absolutePath, 'utf8');
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
}
