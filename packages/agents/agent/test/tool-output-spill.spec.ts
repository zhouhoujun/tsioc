import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter, FileDirectoryEntry } from '@tsdi/common';
import { cleanupToolOutputSpill, spillToolOutput } from '../src/harness/ToolOutputSpill';

class FakeFileAdapter extends FileAdapter {
    readonly files = new Map<string, string>();
    readonly mtimes = new Map<string, number>();

    isAbsolute(target: string): boolean { return target.startsWith('/'); }
    normalize(target: string): string { return target; }
    join(...paths: string[]): string { return paths.join('/').replace(/\/+/g, '/'); }
    resolve(...paths: string[]): string { return this.join(...paths); }
    extname(target: string): string { const i = target.lastIndexOf('.'); return i >= 0 ? target.slice(i) : ''; }
    existsSync(target: string): boolean { return this.files.has(target); }
    read(): any { return null; }
    async find(): Promise<any> { return null; }
    async readText(target: string): Promise<string> { return this.files.get(target) ?? ''; }
    readTextSync(target: string): string { return this.files.get(target) ?? ''; }
    async readJSON<T>(): Promise<T> { return {} as T; }
    readJSONSync<T>(): T { return {} as T; }
    async mkdir(): Promise<void> { }
    async writeText(target: string, content: string): Promise<void> { this.files.set(target, content); }
    async remove(target: string): Promise<void> { this.files.delete(target); this.mtimes.delete(target); }
    async stat(target: string): Promise<any> { return { mtimeMs: this.mtimes.get(target) ?? 0 }; }
    async list(dir: string): Promise<FileDirectoryEntry[]> {
        const entries: FileDirectoryEntry[] = [];
        for (const key of this.files.keys()) {
            if (!key.startsWith(`${dir}/`)) continue;
            const name = key.slice(dir.length + 1);
            if (!name.includes('/')) entries.push({ name, path: key, kind: 'file' });
        }
        return entries;
    }
    seed(path: string, mtimeMs: number): void { this.files.set(path, 'x'); this.mtimes.set(path, mtimeMs); }
}

@Suite('Tool output spill')
export class ToolOutputSpillTest {
    @Test('returns unchanged content when it fits the budget')
    async withinBudget(): Promise<void> {
        const adapter = new FakeFileAdapter();
        const result = await spillToolOutput(adapter, 'short', 100, { workspace: '/ws', toolCallId: 'call-1' });
        expect(result).toEqual('short');
        expect(adapter.files.size).toEqual(0);
    }

    @Test('spills oversized output to the workspace and returns a readable hint')
    async spillsOversizedOutput(): Promise<void> {
        const adapter = new FakeFileAdapter();
        const content = 'x'.repeat(50);
        const result = await spillToolOutput(adapter, content, 10, { workspace: '/ws', toolCallId: 'call/1' });
        const savedPath = '/ws/.tsdi-agent/tool-output/call_1.txt';
        expect(adapter.files.get(savedPath)).toEqual(content);
        expect(result.startsWith('x'.repeat(10))).toEqual(true);
        expect(result).toContain('.tsdi-agent/tool-output/call_1.txt');
        expect(result).toContain('truncated');
    }

    @Test('falls back to inline truncation when disabled or unwritable')
    async fallsBackToInlineTruncation(): Promise<void> {
        const disabled = await spillToolOutput(new FakeFileAdapter(), 'y'.repeat(20), 5, { workspace: '/ws', enabled: false });
        expect(disabled).toEqual('yyyyy...[truncated]');

        const noAdapter = await spillToolOutput(null, 'z'.repeat(20), 5, { workspace: '/ws' });
        expect(noAdapter).toEqual('zzzzz...[truncated]');
    }

    @Test('cleanup removes spilled files past the retention window')
    async cleanupRemovesExpiredFiles(): Promise<void> {
        const adapter = new FakeFileAdapter();
        const dir = '/ws/.tsdi-agent/tool-output';
        adapter.seed(`${dir}/old.txt`, 1000);
        adapter.seed(`${dir}/fresh.txt`, 9000);

        const removed = await cleanupToolOutputSpill(adapter, '/ws', { retentionMs: 5000, now: 10000 });
        expect(removed).toEqual(1);
        expect(adapter.files.has(`${dir}/old.txt`)).toEqual(false);
        expect(adapter.files.has(`${dir}/fresh.txt`)).toEqual(true);
    }
}
