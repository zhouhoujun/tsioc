import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as path from 'path';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { FileAdapter, IReadable } from '@tsdi/common';
import { TrustedProjectStore } from '../src/project/trusted-projects';

class TestFileAdapter extends FileAdapter {
    isAbsolute(target: string): boolean { return path.isAbsolute(target); }
    normalize(target: string): string { return path.normalize(target); }
    join(...targets: string[]): string { return path.join(...targets); }
    resolve(...targets: string[]): string { return path.resolve(...targets); }
    extname(target: string): string { return path.extname(target); }
    existsSync(target: string): boolean { return fs.existsSync(target); }
    read(target: string, options?: any): IReadable { return fs.createReadStream(target, options) as any; }
    async find(): Promise<null> { return null; }
    async readText(target: string, encoding: any = 'utf-8'): Promise<string> { return (await fs.promises.readFile(target, encoding)).toString(); }
    readTextSync(target: string, encoding: any = 'utf-8'): string { return fs.readFileSync(target, encoding).toString(); }
    async readJSON<T = any>(target: string): Promise<T> { return JSON.parse(this.readTextSync(target)); }
    readJSONSync<T = any>(target: string): T { return JSON.parse(this.readTextSync(target)); }
    async writeText(target: string, content: string): Promise<void> { fs.writeFileSync(target, content); }
    async mkdir(target: string, options?: { recursive?: boolean }): Promise<void> { fs.mkdirSync(target, options); }
    async remove(target: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> { fs.rmSync(target, options); }
}

@Suite('Trusted project store (G31)')
export class TrustedProjectStoreTest {
    private root!: string;
    private adapter!: TestFileAdapter;

    @Before()
    setup(): void {
        this.root = mkdtempSync(path.join(tmpdir(), 'tsioc-trust-'));
        this.adapter = new TestFileAdapter();
    }

    @After()
    teardown(): void {
        rmSync(this.root, { recursive: true, force: true });
    }

    private store(): TrustedProjectStore {
        return new TrustedProjectStore({ fileAdapter: this.adapter, root: this.root });
    }

    @Test('reports untrusted for unknown projects')
    untrustedInitially() {
        const store = this.store();
        const status = store.isTrusted('/workspace/project-a');
        expect(status.trusted).toBe(false);
        expect(status.storePath).toBeTruthy();
    }

    @Test('trust then isTrusted returns true with record')
    trustAndCheck() {
        const store = this.store();
        store.trust('/workspace/project-a');
        const status = store.isTrusted('/workspace/project-a');
        expect(status.trusted).toBe(true);
        expect(status.record?.path).toBe('/workspace/project-a');
        expect(status.record?.trustedAt).toBeGreaterThan(0);
        expect(store.list()).toHaveLength(1);
    }

    @Test('deduplicates and updates lastUsedAt on re-trust')
    trustDeduplicates() {
        const store = this.store();
        store.trust('/workspace/project-a');
        store.trust('/workspace/project-a');
        expect(store.list()).toHaveLength(1);
        expect(store.list()[0].lastUsedAt).toBeGreaterThanOrEqual(store.list()[0].trustedAt);
    }

    @Test('persists across store instances')
    persistsAcrossInstances() {
        const store = this.store();
        store.trust('/workspace/project-a');
        const reloaded = this.store();
        expect(reloaded.isTrusted('/workspace/project-a').trusted).toBe(true);
    }

    @Test('untrust removes the record')
    untrustRemoves() {
        const store = this.store();
        store.trust('/workspace/project-a');
        expect(store.untrust('/workspace/project-a')).toBe(true);
        expect(store.isTrusted('/workspace/project-a').trusted).toBe(false);
        expect(store.untrust('/workspace/project-a')).toBe(false);
    }

    @Test('matches resolved paths (trailing slash and relative normalize)')
    matchesResolvedPaths() {
        const store = this.store();
        store.trust('/workspace/project-a');
        expect(store.isTrusted('/workspace/project-a/').trusted).toBe(true);
        expect(store.isTrusted('/workspace/project-b').trusted).toBe(false);
    }

    @Test('recovers from corrupt store file')
    recoversFromCorruptStore() {
        const store = this.store();
        store.trust('/workspace/project-a');
        fs.writeFileSync(path.join(this.root, 'trusted-projects.json'), '{ not valid json');
        expect(store.isTrusted('/workspace/project-a').trusted).toBe(false);
        store.trust('/workspace/project-b');
        expect(store.isTrusted('/workspace/project-b').trusted).toBe(true);
    }
}
