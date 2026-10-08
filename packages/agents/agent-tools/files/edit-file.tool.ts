import { promises as fs } from 'fs';
import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath, toRelativeWorkspacePath } from './path-policy';
import { resolveEditMatch, stripLineNumberPrefixes } from './edit-match';
import { hasFileBeenRead, hasFileBeenWritten, recordFileWrite } from './file-access-registry';
import { readFileSnapshot } from './snapshot';
import { runFormatter } from './formatter';
import { collectLspDiagnostics } from '../lsp/lsp-feedback';

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

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        const requestedPath = this.requirePath(input?.path);
        const oldString = stripLineNumberPrefixes(this.requireOldString(input?.oldString));
        const newString = stripLineNumberPrefixes(this.requireString(input?.newString, 'newString'));
        const replaceAll = input?.replaceAll === true;
        const policy = resolveFilePolicy(this.options);
        const absolutePath = resolveWorkspacePath(requestedPath, policy.rootDir);
        await assertNoSymlinkInWorkspacePath(absolutePath, policy.rootDir);

        const relativePath = toRelativeWorkspacePath(absolutePath, policy.rootDir);
        if (policy.requireReadBeforeWrite
            && !hasFileBeenRead(context?.sessionId ?? '', relativePath)
            && !hasFileBeenWritten(context?.sessionId ?? '', relativePath)) {
            throw new Error(`Refusing to edit '${relativePath}' before reading it. Call read_file on '${relativePath}' first, then retry the edit.`);
        }
        const content = await fs.readFile(absolutePath, 'utf8');
        const match = resolveEditMatch(content, oldString);
        if (!match) {
            throw new Error(`Invalid edit_file input: oldString was not found in '${requestedPath}'.`);
        }
        if (match.occurrences > 1 && !replaceAll) {
            throw new Error(`Invalid edit_file input: oldString matched ${match.occurrences} times in '${requestedPath}'. Set replaceAll to true to replace every match.`);
        }

        const updated = replaceAll
            ? this.replaceAllCompat(content, match.search, newString)
            : content.replace(match.search, newString);
        await fs.writeFile(absolutePath, updated, 'utf8');
        if (policy.requireReadBeforeWrite) {
            recordFileWrite(context?.sessionId ?? '', relativePath);
        }

        const format = await runFormatter(absolutePath, this.options?.format);
        const lspDiagnostics = await collectLspDiagnostics(this.options, absolutePath);

        return {
            path: toRelativeWorkspacePath(absolutePath, policy.rootDir),
            replacements: replaceAll ? match.occurrences : 1,
            bytesWritten: Buffer.byteLength(updated, 'utf8'),
            formatted: format.attempted ? format.formatted ?? null : undefined,
            formatFailure: format.attempted && format.failure ? format.failure : undefined,
            lspDiagnostics
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

    private replaceAllCompat(content: string, search: string, replacement: string): string {
        // Avoid String.prototype.replaceAll so older runtimes keep working.
        return content.split(search).join(replacement);
    }
}
