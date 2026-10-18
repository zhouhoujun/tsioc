import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { GitStepSnapshotStore } from '../src/harness/GitStepSnapshotStore';

/**
 * Repo probe answers instantly; every other command takes ~0.7s, so a blocked
 * main thread is directly observable from the test's own timers.
 */
const SLOW_FAKE_GIT = [
    'if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then echo true; exit 0; fi',
    'sleep 0.7',
    'if [ "$1" = "stash" ]; then echo deadbeefcafe; exit 0; fi',
    'if [ "$1" = "diff" ] && [ "$2" = "--numstat" ]; then printf \'1\\t2\\ta.txt\\n\'; exit 0; fi',
    'if [ "$1" = "diff" ] && [ "$2" = "--unified=3" ]; then printf \'diff --git a/a.txt b/a.txt\\n\'; exit 0; fi',
    'exit 0'
].join('\n');

const FAILING_FAKE_GIT = [
    'if [ "$1" = "rev-parse" ] && [ "$2" = "--is-inside-work-tree" ]; then echo true; exit 0; fi',
    'echo "fatal: boom" >&2',
    'exit 3'
].join('\n');

/** Puts a fake `git` first on PATH; always restore it (the suite shares a process). */
function installFakeGit(dir: string, body: string): () => void {
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin, { recursive: true });
    const file = path.join(bin, 'git');
    fs.writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`, 'utf8');
    fs.chmodSync(file, 0o755);
    const previous = process.env.PATH;
    process.env.PATH = `${bin}${path.delimiter}${previous ?? ''}`;
    return () => {
        if (previous === undefined) {
            delete process.env.PATH;
        } else {
            process.env.PATH = previous;
        }
    };
}

@Suite('GitStepSnapshotStore async git')
export class GitStepSnapshotStoreAsyncTest {
    @Test('capture keeps the event loop free while git runs')
    async captureKeepsTheEventLoopFree() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-step-async-'));
        const restore = installFakeGit(dir, SLOW_FAKE_GIT);
        const store = new GitStepSnapshotStore();
        try {
            let ticks = 0;
            let maxGap = 0;
            let last = Date.now();
            const timer = setInterval(() => {
                const now = Date.now();
                maxGap = Math.max(maxGap, now - last);
                last = now;
                ticks++;
            }, 25);

            const snapshot = await store.capture(dir, { sessionId: 's1', label: 'turn-s1' });
            clearInterval(timer);

            expect(snapshot?.commit).toEqual('deadbeefcafe');
            expect(snapshot?.diffStats).toEqual({ filesChanged: 1, totalAdditions: 1, totalDeletions: 2 });
            // The store used to run git with spawnSync, freezing the whole
            // console (no render, no timers, no Esc) for the entire capture.
            expect(ticks).toBeGreaterThan(10);
            expect(maxGap).toBeLessThan(500);
        } finally {
            restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a failing git reports no snapshot instead of throwing')
    async failingGitYieldsNoSnapshot() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-step-fail-'));
        const restore = installFakeGit(dir, FAILING_FAKE_GIT);
        const store = new GitStepSnapshotStore();
        try {
            expect(await store.capture(dir)).toEqual(null);
            expect(await store.revert('msg-1', 's1')).toEqual({
                reverted: false,
                error: 'no git step snapshot bound to message msg-1'
            });
        } finally {
            restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('a git command past its timeout reports no snapshot instead of throwing')
    async timeoutYieldsNoSnapshot() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-step-timeout-'));
        const restore = installFakeGit(dir, SLOW_FAKE_GIT);
        // Every command sleeps 0.7s while the store allows 0.3s per command.
        const store = new GitStepSnapshotStore({ timeoutMs: 300 });
        try {
            const startedAt = Date.now();
            expect(await store.capture(dir)).toEqual(null);
            expect(Date.now() - startedAt).toBeLessThan(3000);
        } finally {
            restore();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
}
