import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GitOperationsTool } from '../git/git-operations.tool';

function createTmpDir(prefix: string): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!isAlive(pid)) {
            return true;
        }
        await sleep(50);
    }
    return !isAlive(pid);
}

function realGit(cwd: string, args: string[]): void {
    const result = spawnSync('git', args, {
        cwd,
        encoding: 'utf8',
        env: {
            ...process.env,
            GIT_AUTHOR_NAME: 'a',
            GIT_AUTHOR_EMAIL: 'a@b',
            GIT_COMMITTER_NAME: 'a',
            GIT_COMMITTER_EMAIL: 'a@b'
        }
    });
    if (result.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
    }
}

/**
 * `git` is spawned by its fixed name, so the only way to exercise the real
 * process path deterministically is to shadow it on PATH. `rev-parse` (the
 * repository probe) always succeeds so the tool proceeds to the action.
 */
function installFakeGit(binDir: string, body: string): void {
    const script = path.join(binDir, 'git');
    fs.writeFileSync(script, `#!/bin/sh\nif [ "$1" = "rev-parse" ]; then\n    exit 0\nfi\n${body}\n`);
    fs.chmodSync(script, 0o755);
}

@Suite('git operations process handling')
export class GitOperationsProcessTest {

    @Test('a git command no longer blocks the event loop')
    async gitCommandDoesNotBlockEventLoop() {
        const binDir = createTmpDir('tsioc-git-bin-');
        const workspace = createTmpDir('tsioc-git-ws-');
        const originalPath = process.env.PATH;
        let interval: NodeJS.Timeout | undefined;
        try {
            // A status call that takes a while, standing in for a slow action.
            installFakeGit(binDir, 'sleep 3');
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            let ticks = 0;
            interval = setInterval(() => {
                ticks += 1;
            }, 50);
            const startedAt = Date.now();
            const pending = tool.invoke({ action: 'status' }, { sessionId: 's1' } as any);

            await sleep(1000);
            const elapsed = Date.now() - startedAt;

            // The old spawnSync implementation blocked the loop for the whole
            // command: this interval could not run during it, and the wait above
            // only finished once the 3s command was already over.
            expect(ticks).toBeGreaterThan(5);
            expect(elapsed).toBeLessThan(2000);

            const result = await pending;
            expect(result.exitCode).toEqual(0);
        } finally {
            if (interval) {
                clearInterval(interval);
            }
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('an aborted turn stops the git command tree (SIGTERM then SIGKILL)')
    async abortStopsGitCommandTree() {
        const binDir = createTmpDir('tsioc-git-bin2-');
        const workspace = createTmpDir('tsioc-git-ws2-');
        const pidFile = path.join(workspace, 'git.pid');
        const originalPath = process.env.PATH;
        let childPid: number | undefined;
        try {
            // The command records its pid and ignores SIGTERM, so the interrupt
            // must escalate to SIGKILL and stop the whole tree.
            installFakeGit(binDir, `echo $$ > "${pidFile}"\ntrap '' TERM\nsleep 20`);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { action: 'fetch' },
                { sessionId: 's1', signal: controller.signal } as any
            );
            await sleep(300);
            controller.abort();

            let error: Error | undefined;
            let result: any;
            try {
                result = await pending;
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(result).toBeUndefined();
            // Esc must settle in kill time, not wait out the 20s command.
            expect(Date.now() - startedAt).toBeLessThan(10000);

            const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
            expect(pid).toBeGreaterThan(0);
            childPid = pid;
            expect(await waitForExit(pid, 3000)).toEqual(true);
        } finally {
            if (childPid) {
                try {
                    process.kill(childPid, 'SIGKILL');
                } catch {
                    // already gone
                }
            }
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('an already-cancelled turn never runs git')
    async alreadyCancelledDoesNotSpawnGit() {
        const binDir = createTmpDir('tsioc-git-bin3-');
        const workspace = createTmpDir('tsioc-git-ws3-');
        const marker = path.join(workspace, 'ran.txt');
        const originalPath = process.env.PATH;
        try {
            installFakeGit(binDir, `touch "${marker}"`);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            const controller = new AbortController();
            controller.abort();

            let error: Error | undefined;
            try {
                await tool.invoke(
                    { action: 'status' },
                    { sessionId: 's1', signal: controller.signal } as any
                );
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(fs.existsSync(marker)).toEqual(false);
        } finally {
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a finished git action still reports its output and exit code')
    async realRepoStillReportsOutput() {
        const workspace = createTmpDir('tsioc-git-real-');
        try {
            realGit(workspace, ['init', '-q']);
            fs.writeFileSync(path.join(workspace, 'hello.txt'), 'hello\n');

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            const result = await tool.invoke({ action: 'status' }, { sessionId: 's1' } as any);

            expect(result.exitCode).toEqual(0);
            expect(String(result.stdout)).toContain('hello.txt');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a failing write action still throws its git error')
    async failingActionStillThrows() {
        const workspace = createTmpDir('tsioc-git-fail-');
        try {
            realGit(workspace, ['init', '-q']);

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            let error: Error | undefined;
            try {
                await tool.invoke(
                    { action: 'checkout', path: 'no-such-branch-xyz' },
                    { sessionId: 's1' } as any
                );
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toContain('Git checkout failed');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('git output beyond the capture cap still fails loudly instead of being truncated')
    async outputOverflowStillFails() {
        const binDir = createTmpDir('tsioc-git-bin4-');
        const workspace = createTmpDir('tsioc-git-ws4-');
        const originalPath = process.env.PATH;
        try {
            // 20000 bytes is past the 16000 byte capture cap.
            installFakeGit(binDir, `printf '%20000s' ''`);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new GitOperationsTool({ file: { rootDir: workspace } } as any);
            let error: NodeJS.ErrnoException | undefined;
            try {
                await tool.invoke({ action: 'log' }, { sessionId: 's1' } as any);
            } catch (err) {
                error = err as NodeJS.ErrnoException;
            }

            expect(error?.code).toEqual('ENOBUFS');
        } finally {
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
