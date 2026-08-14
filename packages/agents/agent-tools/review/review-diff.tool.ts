import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { promises as fs } from 'fs';
import { spawnSync } from 'child_process';
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

    async invoke(input: any, _context: AgentToolContext): Promise<ReviewDiffResult> {
        const workdir = await this.resolveWorkdir(input?.workdir);
        this.assertGitRepo(workdir);
        assertSandboxCommand('git', resolveSandboxPolicy(this.options), this.name);

        const base = this.resolveBase(input?.base, input?.range);
        const scope = this.resolveScope(input?.scope);
        const paths = this.resolvePaths(input?.paths);
        const includeStats = input?.includeStats !== false;
        const maxDiffChars = this.resolveMaxDiffChars(input?.maxDiffChars);

        const diffArgs = this.buildDiffArgs(scope, base, paths);
        const trackedFiles = scope === 'untracked'
            ? []
            : this.parseLines(this.runGit([...diffArgs.slice(0, 2), '--name-only', ...diffArgs.slice(2)], workdir).stdout);
        const untrackedFiles = scope === 'working-tree' || scope === 'untracked'
            ? this.listUntrackedFiles(workdir, paths)
            : [];
        const files = Array.from(new Set([...trackedFiles, ...untrackedFiles]));

        const trackedDiffResult = scope === 'untracked'
            ? { stdout: '', stderr: '', exitCode: 0 }
            : this.runGit(diffArgs, workdir);
        const untrackedDiffResults = untrackedFiles.map(path => this.runGit(['diff', '--no-color', '--no-index', '--', '/dev/null', path], workdir));
        const rawDiff = [trackedDiffResult.stdout, ...untrackedDiffResults.map(result => result.stdout)].filter(Boolean).join('');
        const diffLimit = Math.min(maxDiffChars, MAX_OUTPUT_CHARS);
        const diff = rawDiff.slice(0, diffLimit);
        const diffTruncated = rawDiff.length > diff.length;

        const trackedStatsResult = includeStats && scope !== 'untracked'
            ? this.runGit([...diffArgs.slice(0, 2), '--stat', ...diffArgs.slice(2)], workdir)
            : null;
        const untrackedStatsResults = includeStats
            ? untrackedFiles.map(path => this.runGit(['diff', '--no-color', '--no-index', '--stat', '--', '/dev/null', path], workdir))
            : [];
        const rawStats = [trackedStatsResult?.stdout, ...untrackedStatsResults.map(result => result.stdout)].filter(Boolean).join('');
        const stats = rawStats.slice(0, MAX_OUTPUT_CHARS);
        const statsTruncated = rawStats.length > stats.length;

        const commitSha = this.resolveCommitSha(base, workdir);

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

    private listUntrackedFiles(workdir: string, paths: string[]): string[] {
        return this.parseLines(this.runGit(['ls-files', '--others', '--exclude-standard', '--', ...paths], workdir).stdout);
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

    private resolveCommitSha(base: string, workdir: string): string | null {
        try {
            const result = this.runGit(['rev-parse', '--verify', `${base}^{commit}`], workdir);
            return result.exitCode === 0 ? result.stdout.trim() || null : null;
        } catch {
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

    private assertGitRepo(workdir: string): void {
        const result = this.runGit(['rev-parse', '--git-dir'], workdir);
        if (result.exitCode !== 0) {
            throw new Error(`'${workdir}' is not a Git repository.`);
        }
    }

    private runGit(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
        const result = spawnSync('git', args, {
            cwd,
            timeout: DEFAULT_TIMEOUT_MS,
            maxBuffer: MAX_OUTPUT_CHARS,
            encoding: 'utf8',
            stdio: 'pipe',
            env: buildSandboxEnv(process.env, resolveSandboxPolicy(this.options))
        });
        const stdout = (result.stdout ?? '').slice(0, MAX_OUTPUT_CHARS);
        const stderr = (result.stderr ?? '').slice(0, MAX_OUTPUT_CHARS);
        const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
        const exitCode = typeof result.status === 'number' ? result.status : 1;

        if (errorCode && errorCode !== 'EPERM' && errorCode !== 'ENOBUFS') {
            throw result.error;
        }

        return {
            stdout,
            stderr,
            exitCode
        };
    }
}
