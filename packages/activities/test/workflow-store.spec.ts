import expect = require('expect');
import {
    HttpWorkflowDefinitionStore,
    InMemoryWorkflowDefinitionStore,
    createWorkflowStoreHandler
} from '../src/visual/workflow-store';
import { VisualWorkflowDefinition } from '../src/visual/types';

function response(status: number, body?: any): any {
    return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => body === undefined ? '' : JSON.stringify(body)
    };
}

function definition(id: string): VisualWorkflowDefinition {
    return {
        id,
        name: `Workflow ${id}`,
        nodes: [{
            id: 'start_1',
            name: 'Start',
            type: 'start',
            position: { x: 0, y: 0 }
        }],
        connections: []
    };
}

describe('Workflow Definition Store', () => {
    it('stores definitions in memory', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const saved = await store.save(definition('a'));
        expect(saved.id).toBe('a');
        expect(saved.nodeCount).toBe(1);
        expect((await store.list()).length).toBe(1);
        expect((await store.get('a'))?.name).toBe('Workflow a');
        expect(await store.remove('a')).toBe(true);
        expect(await store.remove('a')).toBe(false);
        await store.clear();
        expect((await store.list()).length).toBe(0);
    });

    it('maps HTTP routes and auth headers', async () => {
        const calls: Array<{ url: string; init: any }> = [];
        const fetchImpl = async (url: string, init: any) => {
            calls.push({ url, init });
            if (url.endsWith('/workflows') && init.method === 'GET') {
                return response(200, { items: [{ id: 'a', name: 'A', nodeCount: 3, connectionCount: 2 }] });
            }
            if (url.endsWith('/workflows/a') && init.method === 'GET') {
                return response(200, definition('a'));
            }
            if (url.endsWith('/workflows/a') && init.method === 'PUT') {
                return response(200, { summary: { id: 'a', name: 'A saved', nodeCount: 1, connectionCount: 0 } });
            }
            if (url.endsWith('/workflows/a') && init.method === 'DELETE') {
                return response(204);
            }
            return response(404);
        };
        const store = new HttpWorkflowDefinitionStore({
            baseUrl: 'http://gateway/api/',
            token: 'secret',
            fetchImpl: fetchImpl as any
        });

        const list = await store.list();
        expect(list[0].nodeCount).toBe(3);
        expect((await store.get('a'))?.id).toBe('a');
        const saved = await store.save(definition('a'));
        expect(saved.name).toBe('A saved');
        expect(await store.remove('a')).toBe(true);
        expect(await store.get('missing')).toBeUndefined();

        expect(calls[0].url).toBe('http://gateway/api/workflows');
        expect(calls[0].init.headers.authorization).toBe('Bearer secret');
        expect(calls[2].url).toBe('http://gateway/api/workflows/a');
        expect(calls[2].init.headers['content-type']).toBe('application/json');
    });

    it('throws on non-404 HTTP errors', async () => {
        const store = new HttpWorkflowDefinitionStore({
            baseUrl: 'http://gateway',
            fetchImpl: (async () => response(500)) as any
        });
        let error: Error | undefined;
        try {
            await store.get('a');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('HTTP 500');
    });

    it('serves workflows CRUD through a transport-neutral handler', async () => {
        const store = new InMemoryWorkflowDefinitionStore();
        const handle = createWorkflowStoreHandler(store);

        const created = await handle({
            method: 'PUT',
            path: '/api/workflows/a',
            body: {
                id: 'ignored',
                name: 'Workflow A',
                nodes: [{ id: 'start_1', name: 'Start', type: 'start', position: { x: 0, y: 0 } }],
                connections: []
            }
        });
        expect(created.status).toBe(200);
        expect(created.body.definition.id).toBe('a');

        const list = await handle({ method: 'GET', path: '/api/workflows' });
        expect(list.status).toBe(200);
        expect(list.body.items.length).toBe(1);

        const loaded = await handle({ method: 'GET', path: '/workflows/a?x=1' });
        expect(loaded.status).toBe(200);
        expect(loaded.body.name).toBe('Workflow A');

        const missing = await handle({ method: 'GET', path: '/workflows/missing' });
        expect(missing.status).toBe(404);

        const invalid = await handle({ method: 'PUT', path: '/workflows/a', body: '{bad' });
        expect(invalid.status).toBe(400);

        const removed = await handle({ method: 'DELETE', path: '/workflows/a' });
        expect(removed.status).toBe(204);
        const again = await handle({ method: 'DELETE', path: '/workflows/a' });
        expect(again.status).toBe(404);

        expect((await handle({ method: 'POST', path: '/workflows' })).status).toBe(405);
        expect((await handle({ method: 'GET', path: '/other' })).status).toBe(404);
    });
});
