import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ReviewDiffTool } from '../review/review-diff.tool';

function createTmpDir(prefix: string): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * `git` is spawned by its fixed name, so the real process path is exercised by
 * shadowing it on PATH. The repository probe (`rev-parse --git-dir`) succeeds
 * immediately; every other call takes a while, standing in for a slow diff.
 */
function installFakeGit(binDir: string, slowSeconds: number): void {
    const script = path.join(binDir, 'git');
    fs.writeFileSync(script, `#!/bin/sh\nif [ "$1" = "rev-parse" ]; then\n    exit 0\nfi\nsleep ${slowSeconds}\n`);
    fs.chmodSync(script, 0o755);
}

@Suite('review diff process handling')
export class ReviewDiffProcessTest {

    @Test('review_diff no longer blocks the event loop')
    async reviewDiffDoesNotBlockEventLoop() {
        const binDir = createTmpDir('tsioc-review-bin-');
        const workspace = createTmpDir('tsioc-review-ws-');
        const originalPath = process.env.PATH;
        let interval: NodeJS.Timeout | undefined;
        try {
            installFakeGit(binDir, 1);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new ReviewDiffTool({ file: { rootDir: workspace } } as any);
            let ticks = 0;
            interval = setInterval(() => {
                ticks += 1;
            }, 50);
            const startedAt = Date.now();
            const pending = tool.invoke({ scope: 'untracked' }, { sessionId: 's1' } as any);

            await sleep(300);
            const elapsed = Date.now() - startedAt;

            // The old spawnSync implementation blocked the loop: this interval
            // could not run and the wait above only returned after the git call.
            expect(ticks).toBeGreaterThan(3);
            expect(elapsed).toBeLessThan(1000);

            const result = await pending;
            expect(result.scope).toEqual('untracked');
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

    @Test('an aborted turn cancels review_diff')
    async abortedTurnCancelsReviewDiff() {
        const binDir = createTmpDir('tsioc-review-bin2-');
        const workspace = createTmpDir('tsioc-review-ws2-');
        const originalPath = process.env.PATH;
        try {
            installFakeGit(binDir, 5);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new ReviewDiffTool({ file: { rootDir: workspace } } as any);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { scope: 'untracked' },
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
            expect(Date.now() - startedAt).toBeLessThan(4000);
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

    @Test('a finished review still reports files, diff and commit sha')
    async finishedReviewStillReportsOutput() {
        const workspace = createTmpDir('tsioc-review-real-');
        try {
            const git = (args: string[]) => {
                return spawnSync('git', args, {
                    cwd: workspace,
                    encoding: 'utf8',
                    env: {
                        ...process.env,
                        GIT_AUTHOR_NAME: 'a',
                        GIT_AUTHOR_EMAIL: 'a@b',
                        GIT_COMMITTER_NAME: 'a',
                        GIT_COMMITTER_EMAIL: 'a@b'
                    }
                });
            };
            git(['init', '-q']);
            fs.writeFileSync(path.join(workspace, 'hello.txt'), 'hello\n');
            git(['add', '.']);
            git(['commit', '-q', '-m', 'init']);
            fs.writeFileSync(path.join(workspace, 'hello.txt'), 'hello world\n');

            const tool = new ReviewDiffTool({ file: { rootDir: workspace } } as any);
            const result = await tool.invoke({ scope: 'working-tree' }, { sessionId: 's1' } as any);

            expect(result.exitCode).toEqual(0);
            expect(result.files).toContain('hello.txt');
            expect(result.diff).toContain('hello world');
            expect(result.commitSha).toBeTruthy();
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
