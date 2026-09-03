import { Application } from '@tsdi/core';
import expect = require('expect');
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { GitStepSnapshotStore } from '../src/harness/GitStepSnapshotStore';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { AgentModule } from '../src/agent.module';
import { AGENT_OPTIONS } from '../src/tokens';
import { provideAgentOrm } from '../src/orm.module';

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

function git(workspace: string, args: string[]): { stdout: string; exitCode: number } {
    const result = spawnSync('git', args, { cwd: workspace, encoding: 'utf8', stdio: 'pipe' });
    return { stdout: String(result.stdout ?? '').trim(), exitCode: typeof result.status === 'number' ? result.status : 1 };
}

async function createGitRepo(): Promise<string> {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'git-step-'));
    git(dir, ['init', '-q']);
    git(dir, ['config', 'user.email', 'test@example.com']);
    git(dir, ['config', 'user.name', 'test']);
    await fs.promises.writeFile(path.join(dir, 'a.txt'), 'base', 'utf8');
    git(dir, ['add', 'a.txt']);
    git(dir, ['commit', '-q', '-m', 'init']);
    return dir;
}

@Suite('GitStepSnapshotStore')
export class GitStepSnapshotStoreTest {
    @Test('capture returns null outside a git work tree')
    captureReturnsNullOutsideGitRepo() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-step-no-'));
        try {
            const store = new GitStepSnapshotStore();
            expect(store.capture(dir)).toEqual(null);
            expect(store.isAvailable(dir)).toEqual(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('capture returns null when the tree has no tracked changes')
    async captureReturnsNullOnCleanTree() {
        const dir = await createGitRepo();
        try {
            const store = new GitStepSnapshotStore();
            expect(store.capture(dir)).toEqual(null);
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }

    @Test('untracked files alone are not captured')
    async captureIgnoresUntrackedOnlyChanges() {
        const dir = await createGitRepo();
        try {
            await fs.promises.writeFile(path.join(dir, 'new.txt'), 'untracked', 'utf8');
            const store = new GitStepSnapshotStore();
            expect(store.capture(dir)).toEqual(null);
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }

    @Test('capture binds to message id and diff reports the changed files')
    async captureBindDiffAndRevertRoundTrip() {
        const dir = await createGitRepo();
        try {
            await fs.promises.writeFile(path.join(dir, 'a.txt'), 'edited', 'utf8');
            const store = new GitStepSnapshotStore();
            const snapshot = store.capture(dir, { sessionId: 's1', messageId: 'msg-1', label: 'step' });
            expect(snapshot).not.toEqual(null);
            expect(snapshot!.messageId).toEqual('msg-1');
            expect(store.resolveByMessage('msg-1')?.id).toEqual(snapshot!.id);

            await fs.promises.writeFile(path.join(dir, 'a.txt'), 'changed-after', 'utf8');
            const diff = store.diff(snapshot!);
            expect(diff.files.length).toEqual(1);
            expect(diff.files[0].filePath).toEqual('a.txt');
            expect(diff.files[0].status).toEqual('modified');
            expect(diff.rawPatch).toContain('a.txt');

            const reverted = store.revert('msg-1', 's1');
            expect(reverted.reverted).toEqual(true);
            expect(await fs.promises.readFile(path.join(dir, 'a.txt'), 'utf8')).toEqual('edited');
            expect(store.listReverts('s1').length).toEqual(1);

            const unreverted = store.unrevert('s1');
            expect(unreverted.reverted).toEqual(true);
            expect(await fs.promises.readFile(path.join(dir, 'a.txt'), 'utf8')).toEqual('changed-after');
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }

    @Test('revert of an unknown message reports an error and unrevert without history')
    async revertUnknownAndUnrevertWithoutHistory() {
        const dir = await createGitRepo();
        try {
            const store = new GitStepSnapshotStore();
            const reverted = store.revert('no-such-message', 's1');
            expect(reverted.reverted).toEqual(false);
            expect(reverted.error).toBeTruthy();
            const unreverted = store.unrevert('s1');
            expect(unreverted.reverted).toEqual(false);
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }

    @Test('list filters by session and clear removes session snapshots')
    async listAndClearPerSession() {
        const dir = await createGitRepo();
        try {
            await fs.promises.writeFile(path.join(dir, 'a.txt'), 'edited', 'utf8');
            const store = new GitStepSnapshotStore();
            const s1 = store.capture(dir, { sessionId: 's1' });
            const s2 = store.capture(dir, { sessionId: 's2' });
            expect(s1).not.toEqual(null);
            expect(s2).not.toEqual(null);
            expect(store.list('s1').length).toEqual(1);
            expect(store.list('s1')[0].id).toEqual(s1!.id);
            expect(store.list('s2').length).toEqual(1);
            store.clear('s1');
            expect(store.list('s1').length).toEqual(0);
            expect(store.list('s2').length).toEqual(1);
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }
    @Test('capture populates diffStats with additions/deletions/file count')
    async capturePopulatesDiffStats() {
        const dir = await createGitRepo();
        try {
            await fs.promises.writeFile(path.join(dir, 'a.txt'), 'longer content\nfor diff stats\n', 'utf8');
            await fs.promises.writeFile(path.join(dir, 'b.txt'), 'new file\n', 'utf8');
            git(dir, ['add', 'b.txt']);
            const store = new GitStepSnapshotStore();
            const snapshot = store.capture(dir);
            expect(snapshot).not.toEqual(null);
            expect(snapshot!.diffStats).toBeTruthy();
            expect(snapshot!.diffStats!.filesChanged).toEqual(2);
            expect(snapshot!.diffStats!.totalAdditions).toBeGreaterThan(0);
            expect(snapshot!.diffStats!.totalDeletions).toBeGreaterThanOrEqual(0);
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }
}

@Suite('DefaultAgentRuntime git step snapshots')
export class RuntimeGitStepSnapshotTest {
    @Test('turn captures a git snapshot bound to the result message and revert restores the tree')
    async turnCapturesAndRevertRestores() {
        const dir = await createGitRepo();
        try {
            await fs.promises.writeFile(path.join(dir, 'a.txt'), 'dirty', 'utf8');
            const ctx = await Application.run(AgentModule, { providers: [...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any), ...[{ provide: ModelAdapter, useValue: new EchoModelAdapter() },
                { provide: AGENT_OPTIONS, useValue: { ...defaultAgentOptions, ui: { console: { workspace: dir } } } }]] });
            try {
                const runtime = ctx.get(AgentRuntime);

                const result = await runtime.runTurn('s1', 'hello');
                const snapshots = runtime.listGitStepSnapshots('s1');
                expect(snapshots.length).toEqual(1);
                expect(snapshots[0].messageId).toEqual(result.message.id);

                await fs.promises.writeFile(path.join(dir, 'a.txt'), 'changed-after', 'utf8');
                const reverted = await runtime.revertGitStepSnapshot('s1', result.message.id);
                expect(reverted.reverted).toEqual(true);
                expect(await fs.promises.readFile(path.join(dir, 'a.txt'), 'utf8')).toEqual('dirty');

                const unreverted = await runtime.unrevertGitStepSnapshot('s1');
                expect(unreverted.reverted).toEqual(true);
                expect(await fs.promises.readFile(path.join(dir, 'a.txt'), 'utf8')).toEqual('changed-after');

                const diff = runtime.diffGitStepSnapshot('s1', result.message.id);
                expect(diff).not.toEqual(null);
                expect(diff!.files.some(file => file.filePath === 'a.txt')).toEqual(true);
            } finally { await ctx.close(); }
        } finally {
            await fs.promises.rm(dir, { recursive: true, force: true });
        }
    }

    @Test('revert with no bound snapshot reports an error')
    async revertWithoutSnapshot() {
        const ctx = await Application.run(AgentModule, { providers: [...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any), ...[{ provide: ModelAdapter, useValue: new EchoModelAdapter() }]] });
        try {
            const runtime = ctx.get(AgentRuntime);
            const reverted = await runtime.revertGitStepSnapshot('s1', 'missing');
            expect(reverted.reverted).toEqual(false);
            expect(reverted.error).toBeTruthy();
            expect(runtime.listGitStepSnapshots('s1')).toEqual([]);
        } finally { await ctx.close(); }
    }

    @Test('module wiring passes gitStepSnapshots options to the store')
    async moduleWiresGitStepSnapshotOptions() {
        const options = AgentModule.withOptions({
            gitStepSnapshots: { cleanUntracked: false, timeoutMs: 5000 }
        });
        const ctx = await Application.run({
            module: AgentModule,
            providers: [...options.providers!]
        });
        try {
            const store = ctx.get(GitStepSnapshotStore);
            expect(store).toBeInstanceOf(GitStepSnapshotStore);
            expect((store as any).options).toEqual({ cleanUntracked: false, timeoutMs: 5000 });
        } finally {
            await ctx.close();
        }
    }
}
