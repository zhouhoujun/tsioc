import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter, IReadable } from '@tsdi/common';
import { ArtifactStore, normalizeArtifactPath } from '../src/artifacts/ArtifactStore';

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
        const names = new Set<string>();
        for (const key of this.files.keys()) {
            if (!key.startsWith(path + '/')) continue;
            const rest = key.slice(path.length + 1);
            names.add(rest.includes('/') ? rest.split('/')[0] : rest);
        }
        return Array.from(names).map(name => ({ name, path: `${path}/${name}`, kind: 'file' as const }));
    }
}

@Suite('artifact store')
export class ArtifactStoreTest {
    @Test('rejects traversal and absolute artifact paths')
    pathSafety() {
        expect(() => normalizeArtifactPath('../secret.txt')).toThrow();
        expect(() => normalizeArtifactPath('/etc/passwd')).toThrow();
        expect(normalizeArtifactPath('./index.html')).toEqual('index.html');
    }

    @Test('create writes files and list/get round-trip the manifest')
    async createAndList() {
        const adapter = new MemoryFileAdapter();
        const store = new ArtifactStore(adapter);
        const manifest = await store.create('/work/app', {
            title: 'Demo',
            entry: 'index.html',
            files: [
                { path: 'index.html', content: '<h1>hi</h1>' },
                { path: 'style.css', content: 'body{}' }
            ]
        });
        expect(manifest.mime).toEqual('text/html');
        expect(manifest.files).toEqual(['index.html', 'style.css']);
        const listed = await store.list('/work/app');
        expect(listed.map(item => item.id)).toEqual([manifest.id]);
        const loaded = await store.get('/work/app', manifest.id);
        expect(loaded?.title).toEqual('Demo');
        const read = await store.read('/work/app', manifest.id, 'style.css');
        expect(read?.content).toEqual('body{}');
    }

    @Test('update adds files, changes the entry and remove deletes the artifact')
    async updateAndRemove() {
        const adapter = new MemoryFileAdapter();
        const store = new ArtifactStore(adapter);
        const manifest = await store.create('/work/app', {
            title: 'Demo', entry: 'index.html', files: [{ path: 'index.html', content: 'v1' }]
        });
        const updated = await store.update('/work/app', manifest.id, {
            title: 'Demo v2',
            entry: 'app.js',
            files: [{ path: 'app.js', content: 'console.log(1)' }]
        });
        expect(updated.title).toEqual('Demo v2');
        expect(updated.entry).toEqual('app.js');
        expect(updated.files).toContain('index.html');
        expect(await store.read('/work/app', manifest.id, 'app.js')).toBeTruthy();
        expect(await store.remove('/work/app', manifest.id)).toEqual(true);
        expect(await store.get('/work/app', manifest.id)).toBeUndefined();
        expect(await store.remove('/work/app', manifest.id)).toEqual(false);
    }

    @Test('entry must be one of the artifact files')
    async entryValidation() {
        const store = new ArtifactStore(new MemoryFileAdapter());
        await expect(store.create('/work/app', {
            title: 'bad', entry: 'missing.html', files: [{ path: 'index.html', content: '' }]
        })).rejects.toThrow();
    }
}
