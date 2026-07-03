import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { promises as fs } from 'fs';
import { spawnSync } from 'child_process';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_OUTPUT_CHARS = 16000;

@Injectable()
export class GitOperationsTool implements AgentTool {
    name = 'git_operations';
    description = 'Perform Git operations: status, log, diff, branch, commit, push, pull, stash, checkout, and more.';
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
                    'log_graph'
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
            }
        },
        required: ['action']
    };
    toolset = 'git';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const action = this.requireAction(input?.action);
        const readOnlyActions = ['status', 'log', 'diff', 'show', 'branch', 'stash_list', 'log_graph', 'remote'];
        const isReadOnly = readOnlyActions.includes(action);

        const workdir = await this.resolveWorkdir(input?.workdir);
        this.assertGitRepo(workdir);

        const args = this.buildArgs(action, input);
        const output = this.execGit(args, workdir, action);

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
        if (typeof workdir === 'string' && workdir.trim()) {
            try {
                await fs.stat(workdir);
            } catch {
                throw new Error(`Git workdir '${workdir}' does not exist.`);
            }
            return workdir;
        }
        return this.options?.file?.rootDir ?? process.cwd();
    }

    private assertGitRepo(workdir: string): void {
        const result = this.runGit(['rev-parse', '--git-dir'], workdir);
        if (result.exitCode !== 0) {
            throw new Error(`'${workdir}' is not a Git repository.`);
        }
    }

    private buildArgs(action: string, input: any): string[] {
        const args: string[] = [action];
        const path = typeof input?.path === 'string' ? input.path : undefined;
        const message = typeof input?.message === 'string' ? input.message : undefined;
        const maxCount = typeof input?.maxCount === 'number' ? Math.min(Math.max(1, input.maxCount), 100) : undefined;
        const extraArgs = Array.isArray(input?.args) ? input.args.filter((a: any) => typeof a === 'string') : [];

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
        }

        args.push(...extraArgs);
        return args;
    }

    private execGit(args: string[], cwd: string, action: string): { stdout: string; stderr: string; exitCode: number } {
        const isReadOnly = ['status', 'log', 'diff', 'show', 'branch', 'stash_list', 'log_graph', 'remote'].includes(action);
        const result = this.runGit(args, cwd);
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

    private runGit(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
        const result = spawnSync('git', args, {
            cwd,
            timeout: DEFAULT_TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_CHARS,
            encoding: 'utf8',
            stdio: 'pipe'
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
