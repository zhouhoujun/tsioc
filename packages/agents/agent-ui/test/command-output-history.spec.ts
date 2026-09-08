import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { FileAdapter } from '@tsdi/common';
import {
    AgentConsoleCommandOutputHistoryEntry,
    AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE,
    redactCommandOutputSecret
} from '../src/AgentConsoleCommandOutputHistory';
import { BoundedFileCommandOutputStore } from '../src/AgentConsoleBoundedFileCommandOutputStore';

class FakeFileAdapter extends FileAdapter {
    isAbsolute(): boolean {
        return true;
    }
    normalize(p: string): string {
        return p;
    }
    join(...paths: string[]): string {
        return paths.join('/');
    }
    resolve(...paths: string[]): string {
        return paths.join('/');
    }
    extname(p: string): string {
        const i = p.lastIndexOf('.');
        return i >= 0 ? p.slice(i) : '';
    }
    existsSync(): boolean {
        return true;
    }
    read(): any {
        return null as any;
    }
    find(): any {
        return null;
    }
    readText(): Promise<string> {
        return Promise.resolve('');
    }
    readTextSync(): string {
        return '';
    }
    readJSON = (): any => {
        return null;
    };
    readJSONSync(): any {
        return null;
    }
    writeText(): Promise<void> {
        return Promise.resolve();
    }
    mkdir(): Promise<void> {
        return Promise.resolve();
    }
    remove(): Promise<void> {
        return Promise.resolve();
    }
}

function makeEntry(overrides: Partial<AgentConsoleCommandOutputHistoryEntry> = {}): AgentConsoleCommandOutputHistoryEntry {
    return {
        id: `output-${Math.random().toString(36).slice(2)}`,
        command: '/status',
        text: 'ok',
        ts: Date.now(),
        kind: 'result',
        ...overrides
    };
}

function makeStore(cap?: number): BoundedFileCommandOutputStore {
    return new BoundedFileCommandOutputStore(new FakeFileAdapter(), '/tmp', cap);
}

@Suite('Command output durable history')
export class AgentConsoleCommandOutputHistoryTest {
    @Test('durable store appends newest-first')
    async appendNewestFirst() {
        const store = makeStore();
        await store.append(makeEntry({ id: 'output-1', command: '/a' }));
        await store.append(makeEntry({ id: 'output-2', command: '/b' }));
        const page = await store.list();
        expect(page.items.length).toBe(2);
        expect(page.items[0].id).toBe('output-2');
        expect(page.items[1].id).toBe('output-1');
        expect(page.total).toBe(2);
    }

    @Test('durable store evicts oldest beyond cap')
    async evictBeyondCap() {
        const store = makeStore(3);
        for (let i = 1; i <= 5; i++) {
            await store.append(makeEntry({ id: `output-${i}` }));
        }
        const page = await store.list();
        expect(page.items.map(e => e.id)).toEqual(['output-5', 'output-4', 'output-3']);
    }

    @Test('durable store filters by command and text')
    async filterByCommandAndText() {
        const store = makeStore();
        await store.append(makeEntry({ id: 'output-1', command: '/status', text: 'model deepseek' }));
        await store.append(makeEntry({ id: 'output-2', command: '/theme', text: 'solarized' }));
        const byCommand = await store.list({ filter: 'status' });
        expect(byCommand.items.map(e => e.id)).toEqual(['output-1']);
        const byText = await store.list({ filter: 'solar' });
        expect(byText.items.map(e => e.id)).toEqual(['output-2']);
        const none = await store.list({ filter: 'zzz' });
        expect(none.items.length).toBe(0);
    }

    @Test('durable store paginates with cursor')
    async paginateWithCursor() {
        const store = makeStore();
        for (let i = 1; i <= 10; i++) {
            await store.append(makeEntry({ id: `output-${i}` }));
        }
        for (const limit of [3, AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE, 100]) {
            const page = await store.list({ limit });
            expect(page.items.length).toBe(Math.min(10, limit));
        }
        const first = await store.list({ limit: 4 });
        expect(first.items.length).toBe(4);
        expect(first.nextCursor).toBeTruthy();
        const second = await store.list({ limit: 4, cursor: first.nextCursor });
        expect(second.items.length).toBe(4);
        expect(second.items[0].id).not.toBe(first.items[0].id);
        const third = await store.list({ limit: 4, cursor: second.nextCursor });
        expect(third.items.length).toBe(2);
        expect(third.nextCursor).toBeUndefined();
    }

    @Test('durable store isolates sessions and clears all')
    async sessionIsolationAndClear() {
        const store = makeStore();
        await store.append(makeEntry({ id: 'output-1', sessionId: 'ses-a' }));
        await store.append(makeEntry({ id: 'output-2', sessionId: 'ses-b' }));
        const a = await store.list({ sessionId: 'ses-a' });
        expect(a.items.map(e => e.id)).toEqual(['output-1']);
        expect(a.total).toBe(1);
        const removed = await store.clear('ses-a');
        expect(removed).toBe(1);
        const after = await store.list();
        expect(after.items.map(e => e.id)).toEqual(['output-2']);
        const all = await store.clear();
        expect(all).toBe(1);
        expect((await store.list()).items.length).toBe(0);
    }

    @Test('redaction strips bearer and sk- style secrets')
    async redaction() {
        expect(redactCommandOutputSecret('token Bearer abc123def')).toBe('token Bearer [REDACTED]');
        expect(redactCommandOutputSecret('key sk-abcdef123456')).toBe('key [REDACTED]');
        expect(redactCommandOutputSecret('plain result')).toBe('plain result');
    }

    @Test('BoundedFileCommandOutputStore persists through FileAdapter')
    async boundedFileStore() {
        const fake = new FakeFileAdapter();
        const store = new BoundedFileCommandOutputStore(fake, '/tmp');
        await store.append(makeEntry({ id: 'output-1', command: '/status', sessionId: 'ses-x' }));
        await store.append(makeEntry({ id: 'output-2', command: '/theme', sessionId: 'ses-x' }));
        const page = await store.list({ sessionId: 'ses-x', limit: AGENT_CONSOLE_COMMAND_OUTPUT_DEFAULT_PAGE });
        expect(page.items.length).toBe(2);
        expect(page.items[0].id).toBe('output-2');
        const found = await store.get('output-1', 'ses-x');
        expect(found?.command).toBe('/status');
        const cleared = await store.clear('ses-x');
        expect(cleared).toBe(2);
        expect((await store.list()).items.length).toBe(0);
    }
}
