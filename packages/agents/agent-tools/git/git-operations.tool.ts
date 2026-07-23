import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { promises as fs } from 'fs';
import { spawnSync } from 'child_process';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';
import { assertSandboxCommand, buildSandboxEnv, resolveSandboxPolicy } from '../src/sandbox-policy';

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_CHARS = 16000;

@Injectable()
export class GitOperationsTool implements AgentTool {
    name = 'git_operations';
    description = 'Perform Git operations: status, log, diff, branch, commit, push, pull, stash, checkout, worktree, and more.';
    inputSchema = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: [
                    'status', 'log', 'diff', 'show',
                    'branch', 'branch_create', 'branch_delete',
                    'checkout', 'commit', 'push', 'pull', 'fetch',
                    'stash', 'stash_pop', 'stash_list',
                    'merge', 'rebase', 'tag', 'remote',
                    'add', 'reset', 'revert', 'cherry_pick',
                    'apply_patch',
                    'log_graph',
                    'worktree_create', 'worktree_merge', 'worktree_cleanup', 'worktree_list'
                ],
                description: 'Git operation to perform.'
            },
            args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Additional arguments for the git command.'
            },
            message: {
                type: 'string',
                description: 'Commit message (required for commit action).'
            },
            path: {
                type: 'string',
                description: 'Target path/reference (branch name, file path, commit hash).'
            },
            workdir: {
                type: 'string',
                description: 'Git repository working directory (default: workspace root).'
            },
            maxCount: {
                type: 'number',
                description: 'Max log entries (default: 10, for log/log_graph actions).'
            },
            force: {
                type: 'boolean',
                description: 'Force flag (for worktree_cleanup, branch_delete).'
            },
            branch: {
                type: 'string',
                description: 'Branch name for worktree_create (default: derived from path).'
            },
            patch: {
                type: 'string',
                description: 'Patch text for apply_patch.'
            },
            reverse: {
                type: 'boolean',
                description: 'Reverse the patch when using apply_patch.'
            }
        },
        required: ['action']
    };
    toolset = 'git';
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

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = this.requireAction(input?.action);
        const readOnlyActions = ['status', 'log', 'diff', 'show', 'branch', 'stash_list', 'log_graph', 'remote', 'worktree_list'];
        const isReadOnly = readOnlyActions.includes(action);

        const workdir = await this.resolveWorkdir(input?.workdir);
        this.assertGitRepo(workdir);
        assertSandboxCommand('git', resolveSandboxPolicy(this.options), this.name);

        const command = this.buildArgs(action, input);
        const output = this.execGit(command.args, workdir, action, command.stdin);

        return {
            action,
            workdir,
            readOnly: isReadOnly,
            stdout: output.stdout,
            stderr: output.stderr,
            exitCode: output.exitCode
        };
    }

    private requireAction(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid git_operations input: action must be a non-empty string.');
        }
        return value.trim();
    }

    private async resolveWorkdir(workdir: unknown): Promise<string> {
        const policy = resolveFilePolicy(this.options);
        if (typeof workdir === 'string' && workdir.trim()) {
            const cwd = resolveWorkspacePath(workdir, policy.rootDir);
            await assertNoSymlinkInWorkspacePath(cwd, policy.rootDir);
            try {
                await fs.stat(cwd);
            } catch {
                throw new Error(`Git workdir '${workdir}' does not exist.`);
            }
            return cwd;
        }
        return policy.rootDir;
    }

    private assertGitRepo(workdir: string): void {
        const result = this.runGit(['rev-parse', '--git-dir'], workdir);
        if (result.exitCode !== 0) {
            throw new Error(`'${workdir}' is not a Git repository.`);
        }
    }

    private buildArgs(action: string, input: any): { args: string[]; stdin?: string } {
        const args: string[] = [action];
        const path = typeof input?.path === 'string' ? input.path : undefined;
        const message = typeof input?.message === 'string' ? input.message : undefined;
        const maxCount = typeof input?.maxCount === 'number' ? Math.min(Math.max(1, input.maxCount), 100) : undefined;
        const extraArgs = Array.isArray(input?.args) ? input.args.filter((a: any) => typeof a === 'string') : [];
        const branch = typeof input?.branch === 'string' && input.branch.trim() ? input.branch.trim() : undefined;
        const patch = typeof input?.patch === 'string' ? input.patch : undefined;
        const reverse = input?.reverse === true;
        const force = input?.force === true;
        let stdin: string | undefined;

        switch (action) {
            case 'commit':
                if (!message) {
                    throw new Error('git_operations commit requires a message.');
                }
                args.push('-m', message);
                break;
            case 'log':
            case 'log_graph':
                args.push(`--max-count=${maxCount ?? 10}`, '--format=format:%h %s (%ai, %an)');
                if (action === 'log_graph') {
                    args.push('--graph');
                }
                break;
            case 'diff':
                args.push('--no-color');
                if (path) {
                    args.push('--', path);
                }
                break;
            case 'show':
                if (path) {
                    args.push(path);
                }
                break;
            case 'branch':
                if (path) {
                    args.push('--list', path);
                }
                break;
            case 'branch_create':
                args[0] = 'branch';
                if (!path) {
                    throw new Error('git_operations branch_create requires a path (branch name).');
                }
                args.push(path);
                break;
            case 'branch_delete':
                args[0] = 'branch';
                if (!path) {
                    throw new Error('git_operations branch_delete requires a path (branch name).');
                }
                args.push('-D', path);
                break;
            case 'checkout':
                if (!path) {
                    throw new Error('git_operations checkout requires a path (branch name or commit).');
                }
                args.push(path);
                break;
            case 'stash':
            case 'stash_pop':
            case 'stash_list':
                args[0] = action.replace('_', ' ');
                break;
            case 'add':
                if (path) {
                    args.push(path);
                } else {
                    args.push('.');
                }
                break;
            case 'reset':
                if (path) {
                    args.push(path);
                }
                break;
            case 'revert':
                if (!path) {
                    throw new Error('git_operations revert requires a path (commit hash).');
                }
                args.push('--no-edit', path);
                break;
            case 'cherry_pick':
                if (!path) {
                    throw new Error('git_operations cherry_pick requires a path (commit hash).');
                }
                args.push(path);
                break;
            case 'apply_patch':
                args[0] = 'apply';
                if (!patch || !patch.trim()) {
                    throw new Error('git_operations apply_patch requires a patch.');
                }
                args.push('--whitespace=nowarn');
                if (reverse) {
                    args.push('-R');
                }
                args.push('-');
                stdin = patch;
                break;
            case 'push':
            case 'pull':
            case 'fetch':
                if (path) {
                    args.push(path);
                }
                break;
            case 'remote':
            case 'status':
            case 'tag':
                break;
            case 'merge':
                if (!path) {
                    throw new Error('git_operations merge requires a path (branch name).');
                }
                args.push(path, '--no-edit');
                break;
            case 'rebase':
                if (!path) {
                    throw new Error('git_operations rebase requires a path (branch name).');
                }
                args.push(path);
                break;
            case 'worktree_create':
                args[0] = 'worktree';
                if (!path) {
                    throw new Error('git_operations worktree_create requires a path (worktree directory).');
                }
                args.push('add', path);
                if (branch) {
                    args.push(branch);
                }
                break;
            case 'worktree_merge':
                if (!path) {
                    throw new Error('git_operations worktree_merge requires a path (branch name to merge).');
                }
                args[0] = 'merge';
                args.push(path, '--no-edit');
                break;
            case 'worktree_cleanup':
                args[0] = 'worktree';
                if (!path) {
                    throw new Error('git_operations worktree_cleanup requires a path (worktree directory).');
                }
                args.push('remove', path);
                if (force) {
                    args.push('--force');
                }
                break;
            case 'worktree_list':
                args[0] = 'worktree';
                args.push('list');
                break;
        }

        args.push(...extraArgs);
        return { args, stdin };
    }

    private execGit(args: string[], cwd: string, action: string, stdin?: string): { stdout: string; stderr: string; exitCode: number } {
        const readOnlyActions = ['status', 'log', 'diff', 'show', 'branch', 'stash_list', 'log_graph', 'remote', 'worktree_list'];
        const isReadOnly = readOnlyActions.includes(action);
        const result = this.runGit(args, cwd, stdin);
        if (result.exitCode === 0) {
            return {
                stdout: result.stdout,
                stderr: '',
                exitCode: 0
            };
        }
        if (isReadOnly) {
            return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
        }
        throw new Error(`Git ${args[0]} failed: ${result.stderr || 'Unknown error'}`);
    }

    private runGit(args: string[], cwd: string, stdin?: string): { stdout: string; stderr: string; exitCode: number } {
        const result = spawnSync('git', args, {
            cwd,
            timeout: DEFAULT_TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_CHARS,
            encoding: 'utf8',
            stdio: 'pipe',
            input: stdin,
            env: buildSandboxEnv(process.env, resolveSandboxPolicy(this.options))
        });
        const stdout = (result.stdout ?? '').slice(0, MAX_OUTPUT_CHARS);
        const stderr = (result.stderr ?? '').slice(0, MAX_OUTPUT_CHARS);
        const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
        const exitCode = typeof result.status === 'number' ? result.status : 1;

        if (errorCode && errorCode !== 'EPERM') {
            throw result.error;
        }

        return {
            stdout,
            stderr,
            exitCode
        };
    }
}
