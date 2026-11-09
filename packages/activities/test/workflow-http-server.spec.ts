import expect = require('expect');
import * as net from 'node:net';
import * as path from 'node:path';
import { Application, ApplicationContext } from '@tsdi/core';
import { createWorkflowHttpModule } from '../server';
import { InMemoryWorkflowDefinitionStore } from '../src/visual/workflow-store';

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => resolve(port));
        });
    });
}

async function request(url: string, init?: RequestInit): Promise<{ status: number; body: any }> {
    const response = await fetch(url, init);
    const text = await response.text();
    let body: any = text;
    try {
        body = text ? JSON.parse(text) : undefined;
    } catch {
        body = text;
    }
    return { status: response.status, body };
}

async function waitForServer(base: string): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < 5000) {
        try {
            const response = await fetch(`${base}/api/workflows`);
            if (response.ok) {
                return;
            }
        } catch {
            // retry while the microservice binds
        }
        await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('HTTP microservice did not start');
}

describe('Workflow HTTP microservice', () => {
    let ctx: ApplicationContext | undefined;
    let base: string;

    before(async () => {
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        ctx = await Application.run(createWorkflowHttpModule({
            port,
            host: '127.0.0.1',
            store: new InMemoryWorkflowDefinitionStore(),
            staticRoot: path.resolve(__dirname, '../demo')
        }));
        await waitForServer(base);
    });

    after(async () => {
        await ctx?.close();
    });

    it('serves the static demo from the HTTP microservice', async () => {
        const response = await fetch(`${base}/index.html`);
        expect(response.status).toBe(200);
        const text = await response.text();
        expect(text).toContain('TSDI Workflow Designer');
        expect(text).toContain('workflow-app');
    });

    it('exposes workflows CRUD through the framework HTTP router', async () => {
        const definition = {
            id: 'http-demo',
            name: 'HTTP demo',
            nodes: [
                { id: 'start_1', name: 'Start', type: 'start' as const, position: { x: 0, y: 0 } },
                { id: 'end_1', name: 'End', type: 'end' as const, position: { x: 200, y: 0 } }
            ],
            connections: [{
                id: 'c1',
                sourceNodeId: 'start_1',
                sourcePort: 'out',
                targetNodeId: 'end_1',
                targetPort: 'in'
            }]
        };

        const put = await request(`${base}/api/workflows/http-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        expect(put.status).toBe(200);
        expect(put.body.summary.id).toBe('http-demo');

        const list = await request(`${base}/api/workflows`);
        expect(list.status).toBe(200);
        expect(list.body.length).toBe(1);

        const get = await request(`${base}/api/workflows/http-demo`);
        expect(get.status).toBe(200);
        expect(get.body.name).toBe('HTTP demo');

        const run = await request(`${base}/api/workflows/http-demo/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: {} })
        });
        expect(run.status).toBe(200);
        expect(run.body.success).toBe(true);
        expect(run.body.executionState.nodeStates.end_1.status).toBe('success');

        const missing = await request(`${base}/api/workflows/missing`);
        expect(missing.status).toBe(404);

        const removed = await request(`${base}/api/workflows/http-demo`, { method: 'DELETE' });
        expect(removed.status).toBe(200);
        expect(removed.body.removed).toBe(true);
        const after = await request(`${base}/api/workflows/http-demo`);
        expect(after.status).toBe(404);
    });
});
