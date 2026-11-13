import expect = require('expect');
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
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
    let staticRoot: string;

    before(async () => {
        staticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-workflow-static-'));
        fs.writeFileSync(path.join(staticRoot, 'index.html'), '<!DOCTYPE html><title>TSDI Workflow Designer</title><div id="workflow-app"></div>');
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        ctx = await Application.run(createWorkflowHttpModule({
            port,
            host: '127.0.0.1',
            store: new InMemoryWorkflowDefinitionStore(),
            staticRoot
        }));
        await waitForServer(base);
    });

    after(async () => {
        await ctx?.close();
        if (staticRoot) {
            fs.rmSync(staticRoot, { recursive: true, force: true });
        }
    });

    it('serves the static designer from the HTTP microservice', async () => {
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

    it('runs workflows from real webhook requests', async () => {
        const definition = {
            id: 'webhook-demo',
            name: 'Webhook demo',
            nodes: [
                {
                    id: 'in_1', name: 'Orders', type: 'http-in' as const, position: { x: 0, y: 0 },
                    config: { method: 'POST', path: '/orders' }
                },
                {
                    id: 'res_1', name: 'Respond', type: 'http-response' as const, position: { x: 200, y: 0 },
                    config: { statusCode: 201, headers: { 'x-flow': 'yes' }, body: 'payload' }
                }
            ],
            connections: [{
                id: 'w1',
                sourceNodeId: 'in_1',
                sourcePort: 'out',
                targetNodeId: 'res_1',
                targetPort: 'in'
            }]
        };
        const put = await request(`${base}/api/workflows/webhook-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        expect(put.status).toBe(200);

        const matched = await fetch(`${base}/api/workflows/webhook-demo/hook?path=/orders`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hello: 'world' })
        });
        expect(matched.status).toBe(201);
        expect(matched.headers.get('x-flow')).toBe('yes');
        expect(await matched.json()).toEqual({ hello: 'world' });

        const restful = await fetch(`${base}/api/workflows/webhook-demo/hook/orders/42`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ order: 42 })
        });
        expect(restful.status).toBe(201);
        expect(restful.headers.get('x-flow')).toBe('yes');
        expect(await restful.json()).toEqual({ order: 42 });

        const wrongPath = await request(`${base}/api/workflows/webhook-demo/hook?path=/invoices`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ hello: 'world' })
        });
        expect(wrongPath.status).toBe(200);
        expect(wrongPath.body.success).toBe(true);
        expect(wrongPath.body.executionId).toBeTruthy();

        const wrongMethod = await request(`${base}/api/workflows/webhook-demo/hook?path=/orders`);
        expect(wrongMethod.status).toBe(200);
        expect(wrongMethod.body.success).toBe(true);

        const run = await request(`${base}/api/workflows/webhook-demo/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: {} })
        });
        expect(run.status).toBe(200);
        expect(run.body.success).toBe(true);
        expect(run.body.executionState.nodeStates.in_1.result?.data?.matched).toBe(false);
        expect(run.body.executionState.nodeStates.res_1.status).toBe('skipped');

        const removed = await request(`${base}/api/workflows/webhook-demo`, { method: 'DELETE' });
        expect(removed.status).toBe(200);
    });

    it('saves incomplete drafts without requiring a start node', async () => {
        const draft = {
            id: 'draft-demo',
            name: 'Draft',
            nodes: [
                { id: 'task_1', name: 'Task', type: 'task' as const, position: { x: 0, y: 0 } }
            ],
            connections: []
        };
        const put = await request(`${base}/api/workflows/draft-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(draft)
        });
        expect(put.status).toBe(200);

        const get = await request(`${base}/api/workflows/draft-demo`);
        expect(get.status).toBe(200);
        expect(get.body.nodes.length).toBe(1);

        const blank = { id: 'blank-demo', name: 'Blank', nodes: [], connections: [] };
        const blankPut = await request(`${base}/api/workflows/blank-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(blank)
        });
        expect(blankPut.status).toBe(200);

        const blankRun = await request(`${base}/api/workflows/blank-demo/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: {} })
        });
        expect(blankRun.status).toBe(200);
        expect(blankRun.body.success).toBe(false);
        expect(String(blankRun.body.error || '')).toContain('node');

        await request(`${base}/api/workflows/draft-demo`, { method: 'DELETE' });
        await request(`${base}/api/workflows/blank-demo`, { method: 'DELETE' });
    });

    it('applies a run timeout to HTTP executions', async () => {
        const definition = {
            id: 'timeout-demo',
            name: 'Timeout demo',
            nodes: [
                { id: 'start_t', name: 'Start', type: 'start' as const, position: { x: 0, y: 0 } },
                { id: 'delay_t', name: 'Wait', type: 'delay' as const, position: { x: 200, y: 0 }, config: { delay: 500 } },
                { id: 'end_t', name: 'End', type: 'end' as const, position: { x: 400, y: 0 } }
            ],
            connections: [
                { id: 't1', sourceNodeId: 'start_t', sourcePort: 'out', targetNodeId: 'delay_t', targetPort: 'in' },
                { id: 't2', sourceNodeId: 'delay_t', sourcePort: 'out', targetNodeId: 'end_t', targetPort: 'in' }
            ]
        };
        const put = await request(`${base}/api/workflows/timeout-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        expect(put.status).toBe(200);

        const run = await request(`${base}/api/workflows/timeout-demo/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: {}, timeout: 60 })
        });
        expect(run.status).toBe(200);
        expect(run.body.success).toBe(false);
        expect(run.body.status).toBe('cancelled');
        expect(String(run.body.error || '')).toContain('timed out');

        await request(`${base}/api/workflows/timeout-demo`, { method: 'DELETE' });
    });

    it('lists, installs and uninstalls workflow plugins', async () => {
        const catalog = await request(`${base}/api/plugins`);
        expect(catalog.status).toBe(200);
        expect(catalog.body.installed).toEqual([]);
        expect(catalog.body.available.map((item: any) => item.id).sort()).toEqual(['coap', 'exec', 'file', 'mqtt', 'nats', 'redis', 'tcp', 'udp', 'websocket']);

        const install = await request(`${base}/api/plugins/redis/install`, { method: 'POST' });
        expect(install.status).toBe(200);
        expect(install.body.installed).toBe(true);
        expect(install.body.plugin.id).toBe('redis');
        expect(install.body.plugin.nodes.map((node: any) => node.type)).toContain('redis-command');

        const installed = await request(`${base}/api/plugins`);
        expect(installed.body.installed.map((item: any) => item.id)).toEqual(['redis']);

        const again = await request(`${base}/api/plugins/redis/install`, { method: 'POST' });
        expect(again.status).toBe(200);
        expect(again.body.installed).toBe(false);

        const remove = await request(`${base}/api/plugins/redis`, { method: 'DELETE' });
        expect(remove.status).toBe(200);
        expect(remove.body.removed).toBe(true);

        const missing = await request(`${base}/api/plugins/redis`, { method: 'DELETE' });
        expect(missing.status).toBe(404);
    });
});
