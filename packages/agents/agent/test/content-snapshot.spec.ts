import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter, IReadable } from '@tsdi/common';
import {
    ContentAddressedSnapshotStore,
    hashSnapshotContent,
    relativeSnapshotPath
} from '../src/harness/ContentAddressedSnapshotStore';
import { SessionSnapshotController } from '../src/runtime/SessionSnapshotController';

class MemoryFileAdapter extends FileAdapter {
    files = new Map<string, string>();

    isAbsolute(path: string): boolean { return path.startsWith('/'); }
    normalize(path: string): string { return path; }
    join(...paths: string[]): string { return paths.join('/').replace(/\/+/g, '/'); }
    resolve(...paths: string[]): string { return this.join(...paths); }
    extname(path: string): string { const index = path.lastIndexOf('.'); return index >= 0 ? path.slice(index) : ''; }
    existsSync(path: string): boolean { return this.files.has(path); }
    read(): IReadable { throw new Error('stream not supported'); }
    async find(): Promise<null> { return null; }
    async readText(path: string): Promise<string> {
        const content = this.files.get(path);
        if (content === undefined) throw new Error(`ENOENT: ${path}`);
        return content;
    }
    readTextSync(path: string): string { return this.files.get(path) as string; }
    async readJSON<T = any>(path: string): Promise<T> { return JSON.parse(await this.readText(path)); }
    readJSONSync<T = any>(path: string): T { return JSON.parse(this.readTextSync(path)); }
    async writeText(path: string, content: string): Promise<void> { this.files.set(path, content); }
    async mkdir(): Promise<void> { return; }
    async remove(path: string): Promise<void> {
        for (const key of Array.from(this.files.keys())) {
            if (key === path || key.startsWith(path + '/')) this.files.delete(key);
        }
    }
    async list(path: string) {
        return Array.from(this.files.keys())
            .filter(key => key.startsWith(path + '/'))
            .map(key => ({ name: key.slice(path.length + 1), path: key, kind: 'file' as const }));
    }
}

@Suite('content-addressed snapshots')
export class ContentAddressedSnapshotTest {
    @Test('hashes are stable and path relativization strips the workspace')
    hashing() {
        expect(hashSnapshotContent('abc')).toEqual(hashSnapshotContent('abc'));
        expect(hashSnapshotContent('abc')).not.toEqual(hashSnapshotContent('abd'));
        expect(relativeSnapshotPath('/work/app', '/work/app/src/a.ts')).toEqual('src/a.ts');
        expect(relativeSnapshotPath('/work/app', 'src/a.ts')).toEqual('src/a.ts');
    }

    @Test('commit writes a manifest and deduplicates identical blobs')
    async commitManifest() {
        const adapter = new MemoryFileAdapter();
        const store = new ContentAddressedSnapshotStore(adapter);
        store.record('s1', [
            { filePath: '/work/app/a.txt', before: null, after: 'same' },
            { filePath: '/work/app/b.txt', before: null, after: 'same' }
        ]);
        const manifest = await store.commit('s1', '/work/app', 'm1');
        expect(manifest?.id).toEqual('m1');
        expect(manifest?.files.length).toEqual(2);
        const blobs = Array.from(adapter.files.keys()).filter(key => key.includes('/blobs/'));
        expect(blobs.length).toEqual(1);
        const stored = await store.list('s1', '/work/app');
        expect(stored.length).toEqual(1);
        expect(stored[0].messageId).toEqual('m1');
    }

    @Test('restore before removes created files and restores modified content')
    async restoreBefore() {
        const adapter = new MemoryFileAdapter();
        const store = new ContentAddressedSnapshotStore(adapter);
        await adapter.writeText('/work/app/edit.txt', 'before');
        store.record('s1', [{ filePath: '/work/app/edit.txt', before: 'before', after: 'after' }]);
        store.record('s1', [{ filePath: '/work/app/new.txt', before: null, after: 'created' }]);
        await store.commit('s1', '/work/app', 'm1');
        await adapter.writeText('/work/app/edit.txt', 'after');
        await adapter.writeText('/work/app/new.txt', 'created');
        const result = await store.restore('s1', '/work/app', 'm1', 'before');
        expect(result.restored).toEqual(true);
        expect(result.files).toEqual(2);
        expect(await adapter.readText('/work/app/edit.txt')).toEqual('before');
        expect(adapter.existsSync('/work/app/new.txt')).toEqual(false);
        await store.restore('s1', '/work/app', 'm1', 'after');
        expect(await adapter.readText('/work/app/edit.txt')).toEqual('after');
        expect(await adapter.readText('/work/app/new.txt')).toEqual('created');
    }

    @Test('diff reports files changed after the snapshot')
    async diffAfterEdit() {
        const adapter = new MemoryFileAdapter();
        const store = new ContentAddressedSnapshotStore(adapter);
        store.record('s1', [
            { filePath: '/work/app/a.txt', before: 'old', after: 'new' },
            { filePath: '/work/app/b.txt', before: null, after: 'kept' }
        ]);
        await store.commit('s1', '/work/app', 'm1');
        await adapter.writeText('/work/app/a.txt', 'new');
        await adapter.writeText('/work/app/b.txt', 'changed');
        const diff = await store.diff('s1', '/work/app', 'm1');
        expect(diff?.files).toEqual([{ filePath: 'b.txt', status: 'modified' }]);
    }

    @Test('session controller falls back to content snapshots without git')
    async controllerFallback() {
        const adapter = new MemoryFileAdapter();
        await adapter.writeText('/work/app/a.txt', 'v1');
        const store = new ContentAddressedSnapshotStore(adapter);
        const changes: string[] = [];
        const controller = new SessionSnapshotController({
            fileAdapter: adapter,
            contentSnapshots: store,
            workspace: async () => '/work/app',
            afterFileChange: async id => { changes.push(id); }
        });

        await controller.beginGit('s1', '/work/app');
        await adapter.writeText('/work/app/a.txt', 'v2');
        await controller.pushFile('s1', { filePath: '/work/app/a.txt', before: 'v1', after: null, timestamp: 1 });
        await controller.bindGit('s1', 'm1', '/work/app');

        const listed = await controller.listGit('s1');
        expect(listed.some(item => item.messageId === 'm1')).toEqual(true);

        const revert = await controller.revertGit('s1', 'm1');
        expect(revert.reverted).toEqual(true);
        expect(revert.restoredFiles).toEqual(1);
        expect(await adapter.readText('/work/app/a.txt')).toEqual('v1');

        const unrevert = await controller.unrevertGit('s1');
        expect(unrevert.reverted).toEqual(true);
        expect(await adapter.readText('/work/app/a.txt')).toEqual('v2');
        expect(changes).toEqual(['s1']);

        const staged = await controller.stageRevert('s1', 'm1');
        expect(staged.files).toEqual(['a.txt']);
        expect(controller.clearStagedRevert('s1')).toEqual(true);
        expect((await controller.commitStagedRevert('s1')).reverted).toEqual(false);

        const selected = await controller.stageRevert('s1', 'm1', ['a.txt']);
        expect(selected.files).toEqual(['a.txt']);
        const partial = await controller.commitStagedRevert('s1');
        expect(partial.reverted).toEqual(true);
        expect(partial.restoredFiles).toEqual(1);
        expect(await adapter.readText('/work/app/a.txt')).toEqual('v1');

        await adapter.writeText('/work/app/a.txt', 'v2');
        await controller.stageRevert('s1', 'm1');
        const committed = await controller.commitStagedRevert('s1');
        expect(committed.reverted).toEqual(true);
        expect(await adapter.readText('/work/app/a.txt')).toEqual('v1');
    }
}
