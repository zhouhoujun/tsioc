import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';
import { readFileSnapshot } from './snapshot';

@Injectable()
export class EditFileTool implements AgentTool {
    name = 'edit_file';
    description = 'Replace exact text in a workspace file.';
    inputSchema = {
        type: 'object',
        properties: {
            path: { type: 'string' },
            oldString: { type: 'string' },
            newString: { type: 'string' },
            replaceAll: { type: 'boolean' }
        },
        required: ['path', 'oldString', 'newString']
    };
    toolset = 'filesystem';
    source = 'local';
    execution = {
        readOnly: false,
        sideEffect: true,
        requiresSequential: true,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async captureFileSnapshot(input: any, _context?: AgentToolContext): Promise<any> {
        try {
            const requestedPath = this.requirePath(input?.path);
            const policy = resolveFilePolicy(this.options);
            const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
            return await readFileSnapshot(absolutePath);
        } catch {
            return null;
        }
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const requestedPath = this.requirePath(input?.path);
        const oldString = this.requireOldString(input?.oldString);
        const newString = this.requireString(input?.newString, 'newString');
        const replaceAll = input?.replaceAll === true;
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);

        const content = await fs.readFile(absolutePath, 'utf8');
        const matches = this.countMatches(content, oldString);
        if (matches === 0) {
            throw new Error(`Invalid edit_file input: oldString was not found in '${requestedPath}'.`);
        }
        if (matches > 1 && !replaceAll) {
            throw new Error(`Invalid edit_file input: oldString matched ${matches} times in '${requestedPath}'. Set replaceAll to true to replace every match.`);
        }

        const updated = replaceAll
            ? this.replaceAllCompat(content, oldString, newString)
            : content.replace(oldString, newString);
        await fs.writeFile(absolutePath, updated, 'utf8');

        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            replacements: replaceAll ? matches : 1,
            bytesWritten: Buffer.byteLength(updated, 'utf8')
        };
    }

    private requirePath(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid edit_file input: path must be a non-empty string.');
        }
        return value;
    }

    private requireOldString(value: unknown): string {
        if (typeof value !== 'string' || !value.length) {
            throw new Error('Invalid edit_file input: oldString must be a non-empty string.');
        }
        return value;
    }

    private requireString(value: unknown, field: string): string {
        if (typeof value !== 'string') {
            throw new Error(`Invalid edit_file input: ${field} must be a string.`);
        }
        return value;
    }

    private countMatches(content: string, search: string): number {
        let count = 0;
        let index = 0;
        while ((index = content.indexOf(search, index)) !== -1) {
            count += 1;
            index += search.length;
        }
        return count;
    }

    private replaceAllCompat(content: string, search: string, replacement: string): string {
        // Avoid String.prototype.replaceAll so older runtimes keep working.
        return content.split(search).join(replacement);
    }
}
