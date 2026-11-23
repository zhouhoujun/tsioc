import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { WorkflowFileTransport } from '../server/WorkflowFileTransport';
import { WorkflowInboundRunner } from '../server/WorkflowInboundRunner';

function withTimeout<T>(promise: Promise<T>, timeoutMs = 6000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('file node test timed out')), timeoutMs);
        promise.then(
            value => {
                clearTimeout(timer);
                resolve(value);
            },
            error => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

describe('Workflow file nodes', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;
    let root: string;
    let transport: WorkflowFileTransport;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-file-nodes-'));
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
        transport = new WorkflowFileTransport(root);
        service.setFileAccess({
            read: request => transport.read(request),
            write: request => transport.write(request),
            remove: request => transport.remove(request)
        });
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    function flow(nodes: Array<{ type: 'file-in' | 'file-out'; id: string; config: Record<string, any> }>): VisualWorkflowDefinition {
        return {
            id: 'file-flow',
            name: 'File flow',
            nodes: nodes.map((node, index) => registry.createNode(node.type, { x: index * 200, y: 0 }, {
                id: node.id,
                config: node.config
            })),
            connections: nodes.slice(0, -1).map((node, index) => ({
                id: `c${index}`,
                sourceNodeId: node.id,
                sourcePort: 'out',
                targetNodeId: nodes[index + 1].id,
                targetPort: 'in'
            }))
        };
    }

    it('writes a file and reads it back with JSON auto-parsing', async () => {
        const written = await service.execute(flow([
            { type: 'file-out', id: 'write', config: { path: 'nested/out.json', payload: 'payload' } }
        ]), { payload: { ok: true, count: 2 } });
        expect(written.success).toBe(true);
        expect(written.data?.executionState?.nodeStates.write.result?.data?.written).toBe(true);
        const file = path.join(root, 'nested/out.json');
        expect(fs.existsSync(file)).toBe(true);
        expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ ok: true, count: 2 });

        const read = await service.execute(flow([
            { type: 'file-in', id: 'read', config: { path: 'nested/out.json', parse: 'auto' } }
        ]), {});
        expect(read.success).toBe(true);
        const data = read.data?.executionState?.nodeStates.read.result?.data;
        expect(data?.payload).toEqual({ ok: true, count: 2 });
        expect(data?.size).toBeGreaterThan(0);
    });

    it('appends text and keeps raw text when parsing is disabled', async () => {
        await service.execute(flow([
            { type: 'file-out', id: 'w1', config: { path: 'log.txt', payload: 'payload' } }
        ]), { payload: 'line-1\n' });
        await service.execute(flow([
            { type: 'file-out', id: 'w2', config: { path: 'log.txt', payload: 'payload', append: true } }
        ]), { payload: 'line-2\n' });
        expect(fs.readFileSync(path.join(root, 'log.txt'), 'utf8')).toBe('line-1\nline-2\n');

        const read = await service.execute(flow([
            { type: 'file-in', id: 'read', config: { path: 'log.txt', parse: 'text' } }
        ]), {});
        expect(read.data?.executionState?.nodeStates.read.result?.data?.payload).toBe('line-1\nline-2\n');
    });

    it('rejects paths outside the workspace root with an actionable error', async () => {
        const result = await service.execute(flow([
            { type: 'file-out', id: 'escape', config: { path: '../escape.txt', payload: 'payload' } }
        ]), { payload: 'x' });
        expect(result.success).toBe(false);
        expect(String(result.error?.message || '')).toContain('outside the allowed workspace root');
    });

    it('reports a clear error when the host has no file access', async () => {
        const bare = createInjector();
        InjectUtil.use(bare, WorkflowModule);
        const bareService = bare.get(VisualWorkflowService);
        const bareRegistry = bare.get(WorkflowNodeRegistry);
        const result = await bareService.execute({
            id: 'no-file-host',
            name: 'No file host',
            nodes: [bareRegistry.createNode('file-in', { x: 0, y: 0 }, { id: 'read', config: { path: 'a.txt' } })],
            connections: []
        }, {});
        expect(result.success).toBe(false);
        expect(String(result.error?.message || '')).toContain('requires a workflow host with file access');
    });

    it('deletes a file after reading when requested', async () => {
        const file = path.join(root, 'once.json');
        fs.writeFileSync(file, JSON.stringify({ ok: true }));
        const result = await service.execute(flow([
            { type: 'file-in', id: 'read', config: { path: 'once.json', deleteAfterRead: true } }
        ]), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.read.result?.data?.removed).toBe(true);
        expect(fs.existsSync(file)).toBe(false);
    });

    it('starts a run when a watched file changes', async () => {
        const target = path.join(root, 'watched');
        fs.mkdirSync(target, { recursive: true });
        const runner = new WorkflowInboundRunner(service);
        const seen: any[] = [];
        const handle = await runner.start({
            id: 'watch-flow',
            name: 'Watch flow',
            nodes: [
                registry.createNode('watch', { x: 0, y: 0 }, {
                    id: 'watch_1',
                    config: { path: 'watched', debounce: 20 }
                })
            ],
            connections: []
        }, {
            workspaceRoot: root,
            onResult: (_result, message) => seen.push({ path: message.path, event: message.event })
        });
        try {
            await withTimeout(new Promise<void>(resolve => setTimeout(resolve, 120)));
            fs.writeFileSync(path.join(target, 'note.txt'), 'hello');
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => seen.length ? resolve() : setTimeout(tick, 20);
                tick();
            }));
            expect(seen[0].path).toBe(path.join(target, 'note.txt'));
            expect(['change', 'rename']).toContain(seen[0].event);
        } finally {
            await handle.stop();
        }
        expect(handle.running).toBe(false);
    });

    it('starts a run for every tailed line', async () => {
        const file = path.join(root, 'tail.log');
        fs.writeFileSync(file, 'first\n');
        const runner = new WorkflowInboundRunner(service);
        const lines: string[] = [];
        const handle = await runner.start({
            id: 'tail-flow',
            name: 'Tail flow',
            nodes: [
                registry.createNode('tail', { x: 0, y: 0 }, {
                    id: 'tail_1',
                    config: { path: 'tail.log', split: true, sendWholeFile: true }
                })
            ],
            connections: []
        }, {
            workspaceRoot: root,
            onResult: (_result, message) => lines.push(message.data)
        });
        try {
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => lines.length >= 1 ? resolve() : setTimeout(tick, 20);
                tick();
            }));
            expect(lines).toEqual(['first']);

            fs.appendFileSync(file, 'second\nthird\n');
            await withTimeout(new Promise<void>(resolve => {
                const tick = () => lines.length >= 3 ? resolve() : setTimeout(tick, 20);
                tick();
            }));
            expect(lines).toEqual(['first', 'second', 'third']);
        } finally {
            await handle.stop();
        }
        expect(handle.running).toBe(false);
    });
});
