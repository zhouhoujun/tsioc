import expect = require('expect');
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { FileSnapshotStore } from '../src/harness/FileSnapshotStore';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';

class FakeApp {
    events: any[] = [];
    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

function snapshot(filePath: string, before: string | null, after: string | null, ts = 1): any {
    return { filePath, before, after, timestamp: ts };
}

@Suite('FileSnapshotStore')
export class FileSnapshotStoreTest {
    @Test('push records on undo stack and undo/redo moves between stacks')
    pushUndoRedoMovesBetweenStacks() {
        const store = new FileSnapshotStore();
        store.push('s1', snapshot('/a', 'v0', 'v1'));
        store.push('s1', snapshot('/b', null, 'x'));

        const undone = store.undo('s1');
        expect(undone?.filePath).toEqual('/b');
        expect(store.list('s1').length).toEqual(1);
        expect(store.listRedo('s1').length).toEqual(1);

        const redone = store.redo('s1');
        expect(redone?.filePath).toEqual('/b');
        expect(store.list('s1').length).toEqual(2);
        expect(store.listRedo('s1').length).toEqual(0);
    }

    @Test('undo returns null when the stack is empty and redo when empty')
    undoRedoReturnNullWhenEmpty() {
        const store = new FileSnapshotStore();
        expect(store.undo('s1')).toEqual(null);
        expect(store.redo('s1')).toEqual(null);
        store.push('s1', snapshot('/a', 'v0', 'v1'));
        store.undo('s1');
        expect(store.redo('s1')?.filePath).toEqual('/a');
        expect(store.redo('s1')).toEqual(null);
    }

    @Test('a new push drops the redo branch')
    newPushDropsRedoBranch() {
        const store = new FileSnapshotStore();
        store.push('s1', snapshot('/a', 'v0', 'v1'));
        store.undo('s1');
        store.push('s1', snapshot('/c', 'y', 'z'));
        expect(store.listRedo('s1').length).toEqual(0);
        expect(store.undo('s1')?.filePath).toEqual('/c');
    }

    @Test('stacks are isolated per session')
    stacksArePerSession() {
        const store = new FileSnapshotStore();
        store.push('s1', snapshot('/a', 'v0', 'v1'));
        expect(store.undo('s2')).toEqual(null);
        store.push('s2', snapshot('/b', 'x', 'y'));
        expect(store.undo('s2')?.filePath).toEqual('/b');
        expect(store.list('s1').length).toEqual(1);
        store.clear('s1');
        expect(store.list('s1').length).toEqual(0);
        expect(store.list('s2').length).toEqual(0);
    }

    @Test('depth limit evicts the oldest snapshots')
    depthLimitEvictsOldest() {
        const store = new FileSnapshotStore(3);
        for (let i = 0; i < 5; i++) {
            store.push('s1', snapshot(`/f${i}`, 'a', 'b', i));
        }
        const listed = store.list('s1');
        expect(listed.length).toEqual(3);
        expect(listed[0].filePath).toEqual('/f2');
        expect(listed[2].filePath).toEqual('/f4');
    }

    @Test('total byte limit evicts the oldest snapshots')
    byteLimitEvictsOldest() {
        const store = new FileSnapshotStore(50, 10);
        store.push('s1', snapshot('/a', '12345', '12345'));
        store.push('s1', snapshot('/b', '12345', '12345'));
        const listed = store.list('s1');
        expect(listed.length).toEqual(1);
        expect(listed[0].filePath).toEqual('/b');
    }
}

class SnapshotWriteTool {
    name = 'snapshot_write';
    filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    getDefinition() {
        return {
            name: this.name,
            description: 'writes a known string',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { sideEffect: true }
        };
    }

    async captureFileSnapshot(): Promise<any> {
        try {
            return { filePath: this.filePath, before: await fs.readFile(this.filePath, 'utf8') };
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return { filePath: this.filePath, before: null };
            }
            return null;
        }
    }

    async invoke(): Promise<any> {
        await fs.writeFile(this.filePath, 'updated', 'utf8');
        return { ok: true };
    }
}

class SnapshotWriteRegistry extends ToolRegistry {
    constructor(private tool: SnapshotWriteTool) {
        super();
    }
    getTools(): any[] {
        return [this.tool];
    }
    getTool(name: string): any {
        return this.tool.name === name ? this.tool : undefined;
    }
    async invoke(name: string): Promise<any> {
        return this.tool.name === name ? this.tool.invoke() : null;
    }
}

class SingleToolCallModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    constructor(private toolName: string) {
        super();
    }
    async complete(request: any): Promise<any> {
        this.requests.push(request);
        const messages: any[] = request.messages || [];
        const last = messages[messages.length - 1];
        if (!last || last.role === 'user') {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: 'tc-1', name: this.toolName, input: {} }]
            };
        }
        return { message: 'done', stopReason: 'end' };
    }
}

@Suite('DefaultAgentRuntime file undo/redo')
export class RuntimeFileUndoRedoTest {
    @Test('undoFileChange restores the pre-write content and redo re-applies it')
    async undoRestoresAndRedoReapplies() {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'undo-'));
        const filePath = path.join(tmp, 'note.txt');
        await fs.writeFile(filePath, 'original', 'utf8');
        try {
            const store = new FileSnapshotStore();
            const tool = new SnapshotWriteTool(filePath);
            const runtime = new DefaultAgentRuntime(
                new SingleToolCallModelAdapter('snapshot_write'),
                new SnapshotWriteRegistry(tool),
                new InMemorySessionStore(),
                new InMemoryMemoryStore(),
                new SimpleSessionSummarizer(),
                defaultAgentOptions,
                new FakeApp() as any,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                store
            );

            await runtime.runTurn('s1', 'write it');
            expect(await fs.readFile(filePath, 'utf8')).toEqual('updated');
            expect(runtime.listFileSnapshots('s1').length).toEqual(1);

            const undone = await runtime.undoFileChange('s1');
            expect(undone.restored).toEqual('content');
            expect(await fs.readFile(filePath, 'utf8')).toEqual('original');

            const redone = await runtime.redoFileChange('s1');
            expect(redone.restored).toEqual('content');
            expect(await fs.readFile(filePath, 'utf8')).toEqual('updated');
        } finally {
            await fs.rm(tmp, { recursive: true, force: true });
        }
    }

    @Test('undoFileChange returns none when no snapshot exists')
    async undoWithNoSnapshots() {
        const runtime = new DefaultAgentRuntime(
            new EchoModelAdapter(),
            new SnapshotWriteRegistry(new SnapshotWriteTool('/tmp/none.txt')),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );
        const result = await runtime.undoFileChange('s1');
        expect(result).toEqual({ filePath: '', restored: 'none' });
        expect(runtime.listFileSnapshots('s1')).toEqual([]);
    }
}
