import * as path from 'path';
import { runChildProcess } from '@tsdi/agent';

export interface AgentWorktreeInfo {
    path: string;
    branch?: string;
    head?: string;
}

/**
 * Managed git worktrees for session-level isolation (opencode `run -w` /
 * Codex `--worktree`). Paths live under `<workspace>/.tsdi-worktrees`.
 */
export class WorktreeManager {
    private readonly baseDir: string;

    constructor(private readonly workspace: string, baseDir?: string) {
        this.baseDir = baseDir ?? path.join(workspace, '.tsdi-worktrees');
    }

    private async git(args: string[], cwd = this.workspace): Promise<{ ok: boolean; stdout: string; stderr: string }> {
        const result = await runChildProcess({
            command: 'git',
            args,
            cwd,
            timeoutMs: 30000,
            stdin: ''
        });
        return {
            ok: result.kind === 'exit' && result.exitCode === 0,
            stdout: result.stdout ?? '',
            stderr: result.stderr ?? (result.kind === 'timeout' ? 'git timed out' : '')
        };
    }

    async create(name: string, baseBranch = 'HEAD'): Promise<AgentWorktreeInfo> {
        const safe = String(name || '').trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');
        if (!safe) {
            throw new Error('Worktree name must contain at least one safe character.');
        }
        const branch = `tsdi/${safe}`;
        const worktreePath = path.join(this.baseDir, safe);
        const result = await this.git(['worktree', 'add', '-b', branch, worktreePath, baseBranch]);
        if (!result.ok) {
            throw new Error(`Unable to create worktree '${name}': ${result.stderr.trim() || result.stdout.trim()}`);
        }
        return { path: worktreePath, branch };
    }

    async list(): Promise<AgentWorktreeInfo[]> {
        const result = await this.git(['worktree', 'list', '--porcelain']);
        if (!result.ok) {
            throw new Error(`Unable to list worktrees: ${result.stderr.trim()}`);
        }
        const items: AgentWorktreeInfo[] = [];
        let current: Partial<AgentWorktreeInfo> = {};
        for (const line of result.stdout.split('\n')) {
            if (!line.trim()) {
                if (current.path) {
                    items.push(current as AgentWorktreeInfo);
                }
                current = {};
                continue;
            }
            const [key, ...rest] = line.split(' ');
            const value = rest.join(' ').trim();
            if (key === 'worktree') current.path = value;
            if (key === 'HEAD') current.head = value;
            if (key === 'branch') current.branch = value.replace(/^refs\/heads\//, '');
        }
        if (current.path) {
            items.push(current as AgentWorktreeInfo);
        }
        return items;
    }

    /** Merge a managed worktree branch back into the current/base branch. */
    async merge(name: string, targetBranch?: string): Promise<void> {
        const safe = String(name || '').trim().replace(/[^\w./-]+/g, '-');
        if (!safe) {
            throw new Error('Worktree name must contain at least one safe character.');
        }
        const branch = safe.startsWith('tsdi/') ? safe : `tsdi/${safe}`;
        const result = await this.git(['merge', '--no-ff', branch, ...(targetBranch ? [targetBranch] : [])]);
        if (!result.ok) {
            throw new Error(`Unable to merge worktree '${name}': ${result.stderr.trim() || result.stdout.trim()}`);
        }
    }

    async remove(nameOrPath: string, force = false): Promise<void> {
        const target = path.isAbsolute(nameOrPath)
            ? nameOrPath
            : path.join(this.baseDir, nameOrPath);
        const result = await this.git(['worktree', 'remove', ...(force ? ['--force'] : []), target]);
        if (!result.ok) {
            throw new Error(`Unable to remove worktree '${nameOrPath}': ${result.stderr.trim() || result.stdout.trim()}`);
        }
    }
}
