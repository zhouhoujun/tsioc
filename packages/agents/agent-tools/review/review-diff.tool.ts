import { AgentTool, AgentToolContext, CANCELLED_MESSAGE, runChildProcess } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { promises as fs } from 'fs';
import { AgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';
import { assertNoSymlinkInWorkspacePath, resolveFilePolicy, resolveWorkspacePath } from '../files/path-policy';
import { assertSandboxCommand, buildSandboxEnv, resolveSandboxPolicy } from '../src/sandbox-policy';

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_DIFF_CHARS = 60000;
const MAX_OUTPUT_CHARS = 64000;

export interface ReviewDiffResult {
    readOnly: boolean;
    base: string;
    scope: ReviewDiffScope;
    range?: string;
    workdir: string;
    commitSha: string | null;
    files: string[];
    diff: string;
    diffTruncated: boolean;
    stats: string;
    statsTruncated: boolean;
    exitCode?: number;
    stderr?: string;
}

export type ReviewDiffScope = 'working-tree' | 'staged' | 'unstaged' | 'untracked';

/**
 * P80: read-only inline review support. Gathers the current git diff
 * (`git diff HEAD` or an explicit range / file set) without touching the
 * working tree, so a review command can feed the diff to the model and bind
 * the produced findings to the reviewed commit.
 */
@Injectable()
export class ReviewDiffTool implements AgentTool {
    name = 'review_diff';
    description = 'Read-only git diff review: gather the current working-tree diff (base ref, optional range and file set) with per-file stats and the resolved commit sha. Never modifies the working tree.';
    inputSchema = {
        type: 'object',
        properties: {
            base: {
                type: 'string',
                description: 'Base ref to diff the working tree against (default: HEAD).'
            },
            range: {
                type: 'string',
                description: 'Git revision range (e.g. HEAD~3..HEAD) that overrides base.'
            },
            paths: {
                type: 'array',
                items: { type: 'string' },
                description: 'Restrict the review to these files / directories.'
            },
            scope: {
                type: 'string',
                enum: ['working-tree', 'staged', 'unstaged', 'untracked'],
                description: 'Working-tree portion to show (default: working-tree, including untracked files).'
            },
            includeStats: {
                type: 'boolean',
                description: 'Include per-file diff stats (default: true).'
            },
            maxDiffChars: {
                type: 'number',
                description: 'Maximum characters of the diff payload (default: 60000).'
            },
            workdir: {
                type: 'string',
                description: 'Git repository working directory (default: workspace root).'
            }
        }
    };
    toolset = 'review';
    source = 'local';
    execution = {
        readOnly: true,
        sideEffect: false,
        requiresSequential: false,
        authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
    };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, context: AgentToolContext): Promise<ReviewDiffResult> {
        // Esc before the command starts must not launch git work.
        if (context?.signal?.aborted) {
            throw new Error(CANCELLED_MESSAGE);
        }
        const workdir = await this.resolveWorkdir(input?.workdir);
        await this.assertGitRepo(workdir, context?.signal);
        assertSandboxCommand('git', resolveSandboxPolicy(this.options), this.name);

        const base = this.resolveBase(input?.base, input?.range);
        const scope = this.resolveScope(input?.scope);
        const paths = this.resolvePaths(input?.paths);
        const includeStats = input?.includeStats !== false;
        const maxDiffChars = this.resolveMaxDiffChars(input?.maxDiffChars);

        const diffArgs = this.buildDiffArgs(scope, base, paths);
        const trackedFiles = scope === 'untracked'
            ? []
            : this.parseLines((await this.runGit([...diffArgs.slice(0, 2), '--name-only', ...diffArgs.slice(2)], workdir, context?.signal)).stdout);
        const untrackedFiles = scope === 'working-tree' || scope === 'untracked'
            ? await this.listUntrackedFiles(workdir, paths, context?.signal)
            : [];
        const files = Array.from(new Set([...trackedFiles, ...untrackedFiles]));

        const trackedDiffResult = scope === 'untracked'
            ? { stdout: '', stderr: '', exitCode: 0 }
            : await this.runGit(diffArgs, workdir, context?.signal);
        const untrackedDiffResults = await Promise.all(
            untrackedFiles.map(path => this.runGit(['diff', '--no-color', '--no-index', '--', '/dev/null', path], workdir, context?.signal))
        );
        const rawDiff = [trackedDiffResult.stdout, ...untrackedDiffResults.map(result => result.stdout)].filter(Boolean).join('');
        const diffLimit = Math.min(maxDiffChars, MAX_OUTPUT_CHARS);
        const diff = rawDiff.slice(0, diffLimit);
        const diffTruncated = rawDiff.length > diff.length;

        const trackedStatsResult = includeStats && scope !== 'untracked'
            ? await this.runGit([...diffArgs.slice(0, 2), '--stat', ...diffArgs.slice(2)], workdir, context?.signal)
            : null;
        const untrackedStatsResults = includeStats
            ? await Promise.all(
                untrackedFiles.map(path => this.runGit(['diff', '--no-color', '--no-index', '--stat', '--', '/dev/null', path], workdir, context?.signal))
            )
            : [];
        const rawStats = [trackedStatsResult?.stdout, ...untrackedStatsResults.map(result => result.stdout)].filter(Boolean).join('');
        const stats = rawStats.slice(0, MAX_OUTPUT_CHARS);
        const statsTruncated = rawStats.length > stats.length;

        const commitSha = await this.resolveCommitSha(base, workdir, context?.signal);

        return {
            readOnly: true,
            base,
            scope,
            range: typeof input?.range === 'string' && input.range.trim() ? input.range.trim() : undefined,
            workdir,
            commitSha,
            files,
            diff,
            diffTruncated,
            stats,
            statsTruncated,
            exitCode: trackedDiffResult.exitCode,
            stderr: [trackedDiffResult.stderr, ...untrackedDiffResults.map(result => result.stderr)].filter(Boolean).join('\n') || undefined
        };
    }

    private resolveScope(value: unknown): ReviewDiffScope {
        const scope = typeof value === 'string' ? value.trim() : '';
        if (!scope || scope === 'working-tree') return 'working-tree';
        if (scope === 'staged' || scope === 'unstaged' || scope === 'untracked') return scope;
        throw new Error(`Unsupported review diff scope '${scope}'.`);
    }

    private buildDiffArgs(scope: ReviewDiffScope, base: string, paths: string[]): string[] {
        if (scope === 'staged') return ['diff', '--no-color', '--cached', base, '--', ...paths];
        if (scope === 'unstaged') return ['diff', '--no-color', '--', ...paths];
        return ['diff', '--no-color', base, '--', ...paths];
    }

    private async listUntrackedFiles(workdir: string, paths: string[], signal?: AbortSignal): Promise<string[]> {
        const result = await this.runGit(['ls-files', '--others', '--exclude-standard', '--', ...paths], workdir, signal);
        return this.parseLines(result.stdout);
    }

    private parseLines(value: string): string[] {
        return value.split('\n').map(line => line.trim()).filter(Boolean);
    }

    private resolveBase(base: unknown, range: unknown): string {
        if (typeof range === 'string' && range.trim()) {
            return range.trim();
        }
        const resolved = typeof base === 'string' && base.trim() ? base.trim() : 'HEAD';
        if (resolved.includes('..')) {
            return resolved;
        }
        return resolved;
    }

    private resolvePaths(paths: unknown): string[] {
        if (!Array.isArray(paths)) {
            return [];
        }
        return paths.filter((path): path is string => typeof path === 'string' && !!path.trim());
    }

    private resolveMaxDiffChars(value: unknown): number {
        return typeof value === 'number' && Number.isFinite(value) && value > 0
            ? Math.min(Math.floor(value), MAX_OUTPUT_CHARS)
            : DEFAULT_MAX_DIFF_CHARS;
    }

    private async resolveCommitSha(base: string, workdir: string, signal?: AbortSignal): Promise<string | null> {
        try {
            const result = await this.runGit(['rev-parse', '--verify', `${base}^{commit}`], workdir, signal);
            return result.exitCode === 0 ? result.stdout.trim() || null : null;
        } catch (error) {
            // A user interrupt must not be reported as "no commit to resolve".
            if (signal?.aborted) {
                throw error;
            }
            return null;
        }
    }

    private async resolveWorkdir(workdir: unknown): Promise<string> {
        const policy = resolveFilePolicy(this.options);
        if (typeof workdir === 'string' && workdir.trim()) {
            const cwd = resolveWorkspacePath(workdir, policy.rootDir);
            await assertNoSymlinkInWorkspacePath(cwd, policy.rootDir);
            try {
                await fs.stat(cwd);
            } catch {
                throw new Error(`Review workdir '${workdir}' does not exist.`);
            }
            return cwd;
        }
        return policy.rootDir;
    }

    private async assertGitRepo(workdir: string, signal?: AbortSignal): Promise<void> {
        const result = await this.runGit(['rev-parse', '--git-dir'], workdir, signal);
        if (result.exitCode !== 0) {
            throw new Error(`'${workdir}' is not a Git repository.`);
        }
    }

    /**
     * Runs `git` without blocking the event loop. The previous `spawnSync`
     * froze the console (no render, no Esc, no timers) for the duration of the
     * command; the shared runner spawns asynchronously and stops the command
     * tree when the owning turn is cancelled.
     *
     * `EPERM` and `ENOBUFS` stay tolerated (the captured output is reported
     * with exit code 1) as the sync version did; everything else is thrown.
     */
    private async runGit(args: string[], cwd: string, signal?: AbortSignal): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        const outcome = await runChildProcess({
            command: 'git',
            args,
            cwd,
            env: buildSandboxEnv(process.env, resolveSandboxPolicy(this.options)),
            // The sync version closed stdin after writing (no) input.
            stdin: '',
            timeoutMs: DEFAULT_TIMEOUT_MS,
            maxOutputChars: MAX_OUTPUT_CHARS,
            signal
        });
        switch (outcome.kind) {
            case 'cancelled':
                throw new Error(CANCELLED_MESSAGE);
            case 'overflow':
                // Output past the capture cap is reported as a failed run with
                // the partial output, mirroring the sync version's ENOBUFS
                // tolerance.
                return { stdout: outcome.stdout, stderr: outcome.stderr, exitCode: 1 };
            case 'error':
                if (outcome.error.code && outcome.error.code !== 'EPERM' && outcome.error.code !== 'ENOBUFS') {
                    throw outcome.error;
                }
                return { stdout: outcome.stdout, stderr: outcome.stderr, exitCode: 1 };
            case 'timeout': {
                const error: NodeJS.ErrnoException = new Error('spawn git ETIMEDOUT');
                error.code = 'ETIMEDOUT';
                throw error;
            }
            default:
                return {
                    stdout: outcome.stdout.slice(0, MAX_OUTPUT_CHARS),
                    stderr: outcome.stderr.slice(0, MAX_OUTPUT_CHARS),
                    exitCode: outcome.exitCode ?? 1
                };
        }
    }
}
