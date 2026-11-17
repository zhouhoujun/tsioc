import expect = require('expect');
import * as fs from 'node:fs';
import * as net from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import { Application, ApplicationContext } from '@tsdi/core';
import { createWorkflowHttpModule } from '../server';
import { InMemoryWorkflowDefinitionStore } from '../src/visual/workflow-store';
import { InMemoryWorkflowExecutionStore } from '../server/WorkflowExecutionStore';
import { InMemoryWorkflowAuditStore } from '../server/WorkflowAuditStore';
import { InMemoryWorkflowCredentialStore } from '../server/WorkflowCredentialStore';

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
    let executionStore: InMemoryWorkflowExecutionStore;
    let auditStore: InMemoryWorkflowAuditStore;
    let credentialStore: InMemoryWorkflowCredentialStore;

    before(async () => {
        staticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-workflow-static-'));
        fs.writeFileSync(path.join(staticRoot, 'index.html'), '<!DOCTYPE html><title>TSDI Workflow Designer</title><div id="workflow-app"></div>');
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        executionStore = new InMemoryWorkflowExecutionStore();
        auditStore = new InMemoryWorkflowAuditStore();
        credentialStore = new InMemoryWorkflowCredentialStore();
        ctx = await Application.run(createWorkflowHttpModule({
            port,
            host: '127.0.0.1',
            store: new InMemoryWorkflowDefinitionStore(),
            executionStore,
            auditStore,
            credentialStore,
            staticRoot,
            workspaceRoot: staticRoot
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

    it('versions explicit saves, publishes a release and runs the released graph', async () => {
        const published = {
            id: 'versioned',
            name: 'Published graph',
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
        const json = { 'content-type': 'application/json' };

        const saved = await request(`${base}/api/workflows/versioned/save`, {
            method: 'POST', headers: json, body: JSON.stringify(published)
        });
        expect(saved.status).toBe(200);
        expect(saved.body.version.version).toBe(1);
        expect(saved.body.version.kind).toBe('save');

        // Autosave (PUT) only rewrites the draft; it must not grow the history.
        await request(`${base}/api/workflows/versioned`, {
            method: 'PUT', headers: json,
            body: JSON.stringify({ ...published, name: 'Draft rename' })
        });
        const afterDraft = await request(`${base}/api/workflows/versioned/versions`);
        expect(afterDraft.body.items.length).toBe(1);
        expect(afterDraft.body.release).toBeFalsy();

        const publish = await request(`${base}/api/workflows/versioned/publish`, {
            method: 'POST', headers: json,
            body: JSON.stringify({ ...published, name: 'Draft rename' })
        });
        expect(publish.status).toBe(200);
        expect(publish.body.release.version).toBe(2);
        expect(publish.body.version.kind).toBe('publish');

        const listed = await request(`${base}/api/workflows/versioned/versions`);
        expect(listed.body.items.map((item: any) => item.version)).toEqual([2, 1]);
        expect(listed.body.release.version).toBe(2);

        const v1 = await request(`${base}/api/workflows/versioned/versions/1`);
        expect(v1.status).toBe(200);
        expect(v1.body.definition.name).toBe('Published graph');

        // Editing the draft afterwards must not change what entry points run.
        // A cyclic draft is accepted as a draft but cannot be executed or published.
        const unrunnable = {
            ...published,
            name: 'Half-built draft',
            connections: [
                ...published.connections,
                { id: 'c2', sourceNodeId: 'end_1', sourcePort: 'out', targetNodeId: 'start_1', targetPort: 'in' }
            ]
        };
        const draftPut = await request(`${base}/api/workflows/versioned`, {
            method: 'PUT', headers: json, body: JSON.stringify(unrunnable)
        });
        expect(draftPut.status).toBe(200);

        const run = await request(`${base}/api/workflows/versioned/run`, {
            method: 'POST', headers: json, body: JSON.stringify({ context: {} })
        });
        expect(run.status).toBe(200);
        expect(run.body.success).toBe(true);

        // Publishing the broken draft must fail with a readable error.
        const failedPublish = await request(`${base}/api/workflows/versioned/publish`, {
            method: 'POST', headers: json, body: JSON.stringify(unrunnable)
        });
        expect(failedPublish.status).toBe(400);

        const restored = await request(`${base}/api/workflows/versioned/versions/1/restore`, {
            method: 'POST', headers: json, body: '{}'
        });
        expect(restored.status).toBe(200);
        expect(restored.body.definition.name).toBe('Published graph');
        const draft = await request(`${base}/api/workflows/versioned`);
        expect(draft.body.name).toBe('Published graph');

        // Roll back by pointing the release at an existing version.
        const rollback = await request(`${base}/api/workflows/versioned/versions/1/publish`, {
            method: 'POST', headers: json, body: '{}'
        });
        expect(rollback.status).toBe(200);
        expect(rollback.body.release.version).toBe(1);
        const afterRollback = await request(`${base}/api/workflows/versioned/versions`);
        expect(afterRollback.body.release.version).toBe(1);
        // The promoted snapshot survives draft-save retention.
        expect(afterRollback.body.items.find((item: any) => item.version === 1).kind).toBe('publish');

        const missingRollback = await request(`${base}/api/workflows/versioned/versions/99/publish`, {
            method: 'POST', headers: json, body: '{}'
        });
        expect(missingRollback.status).toBe(404);

        const removed = await request(`${base}/api/workflows/versioned`, { method: 'DELETE' });
        expect(removed.status).toBe(200);
        const clearedVersions = await request(`${base}/api/workflows/versioned/versions`);
        expect(clearedVersions.body.items.length).toBe(0);
        expect(clearedVersions.body.release).toBeFalsy();
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

    it('clears run history through the HTTP API', async () => {
        const definition = {
            id: 'clear-runs',
            name: 'Clear runs',
            nodes: [
                { id: 'start_1', name: 'Start', type: 'start' as const, position: { x: 0, y: 0 } },
                { id: 'end_1', name: 'End', type: 'end' as const, position: { x: 200, y: 0 } }
            ],
            connections: [{
                id: 'c1', sourceNodeId: 'start_1', sourcePort: 'out', targetNodeId: 'end_1', targetPort: 'in'
            }]
        };
        const json = { 'content-type': 'application/json' };
        await request(`${base}/api/workflows/clear-runs`, {
            method: 'PUT', headers: json, body: JSON.stringify(definition)
        });
        await request(`${base}/api/workflows/clear-runs/run`, {
            method: 'POST', headers: json, body: JSON.stringify({ context: {} })
        });
        const before = await request(`${base}/api/executions?workflowId=clear-runs`);
        expect(before.body.length).toBeGreaterThan(0);

        const cleared = await request(`${base}/api/executions?workflowId=clear-runs`, { method: 'DELETE' });
        expect(cleared.status).toBe(200);
        const after = await request(`${base}/api/executions?workflowId=clear-runs`);
        expect(after.body.length).toBe(0);
    });

    it('inspects and cancels executions through the HTTP API', async () => {
        const definition = {
            id: 'execution-demo',
            name: 'Execution demo',
            nodes: [
                { id: 'start_e', name: 'Start', type: 'start' as const, position: { x: 0, y: 0 } },
                { id: 'delay_e', name: 'Wait', type: 'delay' as const, position: { x: 200, y: 0 }, config: { delay: 400 } }
            ],
            connections: [{
                id: 'e1', sourceNodeId: 'start_e', sourcePort: 'out', targetNodeId: 'delay_e', targetPort: 'in'
            }]
        };
        const put = await request(`${base}/api/workflows/execution-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        expect(put.status).toBe(200);

        const runPromise = fetch(`${base}/api/workflows/execution-demo/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: {} })
        });

        let executionId = '';
        for (let attempt = 0; attempt < 80 && !executionId; attempt++) {
            const list = await request(`${base}/api/executions?workflowId=execution-demo`);
            expect(list.status).toBe(200);
            if (list.body.length) {
                executionId = list.body[0].executionId;
            } else {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        expect(executionId).toBeTruthy();

        const detail = await request(`${base}/api/executions/${executionId}`);
        expect(detail.status).toBe(200);
        expect(detail.body.executionId).toBe(executionId);
        expect(detail.body.workflowId).toBe('execution-demo');

        const cancel = await request(`${base}/api/executions/${executionId}/cancel`, { method: 'POST' });
        expect(cancel.status).toBe(200);
        expect(cancel.body.cancelled).toBe(true);

        const runBody = await (await runPromise).json();
        expect(runBody.status).toBe('cancelled');

        const persisted = await executionStore.get(executionId);
        expect(persisted?.workflowId).toBe('execution-demo');
        expect(persisted?.status).toBe('cancelled');

        const again = await request(`${base}/api/executions/${executionId}/cancel`, { method: 'POST' });
        expect(again.body.cancelled).toBe(false);

        const missing = await request(`${base}/api/executions/missing`);
        expect(missing.status).toBe(404);
        const missingCancel = await request(`${base}/api/executions/missing/cancel`, { method: 'POST' });
        expect(missingCancel.status).toBe(404);

        await request(`${base}/api/workflows/execution-demo`, { method: 'DELETE' });
        expect((await executionStore.list('execution-demo')).length).toBe(0);
    });

    it('applies the workspace policy to file plugin nodes', async () => {
        const install = await request(`${base}/api/plugins/file/install`, { method: 'POST' });
        expect(install.status).toBe(200);
        const outsidePath = path.join(staticRoot, '..', 'workflow-policy-outside.txt');
        const insidePath = path.join(staticRoot, 'policy-inside.txt');
        const writeDefinition = (id: string, file: string) => ({
            id,
            name: 'Policy demo',
            nodes: [{
                id: 'file_write', name: 'Write', type: 'file-write' as const,
                position: { x: 0, y: 0 },
                config: { path: file, content: 'policy' }
            }],
            connections: []
        });
        try {
            await request(`${base}/api/workflows/policy-outside`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(writeDefinition('policy-outside', outsidePath))
            });
            const denied = await request(`${base}/api/workflows/policy-outside/run`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ context: {} })
            });
            expect(denied.body.success).toBe(false);
            expect(String(denied.body.error || '')).toContain(staticRoot);
            expect(fs.existsSync(outsidePath)).toBe(false);

            await request(`${base}/api/workflows/policy-inside`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(writeDefinition('policy-inside', insidePath))
            });
            const allowed = await request(`${base}/api/workflows/policy-inside/run`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ context: {} })
            });
            expect(allowed.body.success).toBe(true);
            expect(fs.readFileSync(insidePath, 'utf8')).toBe('policy');
        } finally {
            fs.rmSync(insidePath, { force: true });
            fs.rmSync(outsidePath, { force: true });
            await request(`${base}/api/workflows/policy-outside`, { method: 'DELETE' });
            await request(`${base}/api/workflows/policy-inside`, { method: 'DELETE' });
            await request(`${base}/api/plugins/file`, { method: 'DELETE' });
        }
    });

    it('runs stored sub-workflows by id through the HTTP API', async () => {
        await request(`${base}/api/workflows/child-http`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                id: 'child-http',
                name: 'Child',
                nodes: [{ id: 'child_task', name: 'Child', type: 'task', position: { x: 0, y: 0 } }],
                connections: []
            })
        });
        await request(`${base}/api/workflows/parent-http`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                id: 'parent-http',
                name: 'Parent',
                nodes: [{
                    id: 'subprocess_1', name: 'Sub', type: 'subprocess',
                    position: { x: 0, y: 0 }, config: { workflow: 'child-http' }
                }],
                connections: []
            })
        });
        const run = await request(`${base}/api/workflows/parent-http/run`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ context: {} })
        });
        expect(run.status).toBe(200);
        expect(run.body.success).toBe(true);
        expect(run.body.executionState.nodeStates.subprocess_1.result?.data?.subprocess).toBeTruthy();

        await request(`${base}/api/workflows/parent-http`, { method: 'DELETE' });
        await request(`${base}/api/workflows/child-http`, { method: 'DELETE' });
    });

    it('reports workflow metrics from execution history', async () => {
        const definition = {
            id: 'metrics-demo',
            name: 'Metrics demo',
            nodes: [
                { id: 'start_m', name: 'Start', type: 'start' as const, position: { x: 0, y: 0 } },
                { id: 'end_m', name: 'End', type: 'end' as const, position: { x: 200, y: 0 } }
            ],
            connections: [{
                id: 'm1', sourceNodeId: 'start_m', sourcePort: 'out', targetNodeId: 'end_m', targetPort: 'in'
            }]
        };
        await request(`${base}/api/workflows/metrics-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        await request(`${base}/api/workflows/metrics-demo/run`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });
        await request(`${base}/api/workflows/metrics-demo/run`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });

        const metrics = await request(`${base}/api/workflows/metrics-demo/metrics`);
        expect(metrics.status).toBe(200);
        expect(metrics.body.runs).toBe(2);
        expect(metrics.body.succeeded).toBe(2);
        expect(metrics.body.failed).toBe(0);
        expect(metrics.body.lastStatus).toBe('completed');
        expect(metrics.body.nodes.length).toBeGreaterThanOrEqual(2);
        expect(metrics.body.nodes.find((node: any) => node.nodeId === 'start_m')?.runs).toBe(2);
        // Without a window there is no trend, so hosts only pay for it on demand.
        expect(metrics.body.trend).toEqual([]);
        expect(metrics.body.windowMs).toBeUndefined();
        expect(metrics.status).toBe(200);

        const windowed = await request(
            `${base}/api/workflows/metrics-demo/metrics?window=3600000&buckets=6`
        );
        expect(windowed.status).toBe(200);
        expect(windowed.body.runs).toBe(2);
        expect(windowed.body.windowMs).toBe(3600000);
        expect(windowed.body.trend.length).toBe(6);
        const windowedRuns = windowed.body.trend.reduce((sum: number, point: any) => sum + point.runs, 0);
        expect(windowedRuns).toBe(2);
        const lastBucket = windowed.body.trend[5];
        expect(lastBucket.runs).toBe(2);
        expect(lastBucket.failed).toBe(0);
        expect(lastBucket.avgDurationMs).toBeGreaterThanOrEqual(0);
        expect(lastBucket.end - lastBucket.start).toBeGreaterThan(0);

        // Runs outside the window are ignored.
        const stale = await request(`${base}/api/workflows/metrics-demo/metrics?window=1&buckets=4`);
        expect(stale.body.runs).toBe(0);
        expect(stale.body.trend.length).toBe(4);
        expect(stale.body.trend.every((point: any) => point.runs === 0)).toBe(true);
        expect((await request(`${base}/api/workflows/missing/metrics`)).status).toBe(404);

        await request(`${base}/api/workflows/metrics-demo`, { method: 'DELETE' });
    });

    it('stores credentials without returning their values', async () => {
        const saved = await request(`${base}/api/credentials/api-token`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ value: 'super-secret' })
        });
        expect(saved.status).toBe(200);
        expect(saved.body.saved).toBe(true);
        expect(await credentialStore.getCredential('api-token')).toBe('super-secret');

        const list = await request(`${base}/api/credentials`);
        expect(list.body).toEqual(['api-token']);

        const invalid = await request(`${base}/api/credentials/bad`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({})
        });
        expect(invalid.status).toBe(400);

        const removed = await request(`${base}/api/credentials/api-token`, { method: 'DELETE' });
        expect(removed.body.removed).toBe(true);
        expect(await request(`${base}/api/credentials`).then(response => response.body)).toEqual([]);
        expect((await request(`${base}/api/credentials/api-token`, { method: 'DELETE' })).status).toBe(404);
    });

    it('records configuration, deployment and plugin audit entries', async () => {
        const definition = {
            id: 'audit-demo',
            name: 'Audit demo',
            nodes: [{
                id: 'inject_a', name: 'Tick', type: 'inject',
                position: { x: 0, y: 0 },
                config: { trigger: 'interval', interval: 10, intervalUnit: 's', payload: {} }
            }],
            connections: []
        };
        await request(`${base}/api/workflows/audit-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        await request(`${base}/api/workflows/audit-demo/publish`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        await request(`${base}/api/workflows/audit-demo/schedule`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });
        await request(`${base}/api/workflows/audit-demo/schedule`, { method: 'DELETE' });
        await request(`${base}/api/workflows/audit-demo`, { method: 'DELETE' });

        const entries = await request(`${base}/api/audit?workflowId=audit-demo&limit=20`);
        expect(entries.status).toBe(200);
        const actions = entries.body.map((entry: any) => entry.action);
        expect(actions).toContain('save');
        expect(actions).toContain('publish');
        expect(actions).toContain('schedule-start');
        expect(actions).toContain('schedule-stop');
        expect(actions).toContain('delete');

        const published = await request(`${base}/api/audit?action=publish`);
        expect(published.body.every((entry: any) => entry.action === 'publish')).toBe(true);
    });

    it('manages deployments for every schedulable workflow', async () => {
        const scheduled = {
            id: 'deploy-a',
            name: 'Deploy A',
            nodes: [{
                id: 'inject_d', name: 'Tick', type: 'inject',
                position: { x: 0, y: 0 },
                config: { trigger: 'interval', interval: 10, intervalUnit: 's', payload: {} }
            }],
            connections: []
        };
        const plain = {
            id: 'deploy-b',
            name: 'Deploy B',
            nodes: [{ id: 'task_d', name: 'Task', type: 'task', position: { x: 0, y: 0 } }],
            connections: []
        };
        for (const definition of [scheduled, plain]) {
            await request(`${base}/api/workflows/${definition.id}`, {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(definition)
            });
        }
        expect((await request(`${base}/api/deployments`)).body).toEqual([]);

        const started = await request(`${base}/api/deployments/start`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });
        expect(started.status).toBe(200);
        expect(started.body.started.map((item: any) => item.workflowId)).toEqual(['deploy-a']);
        const listed = await request(`${base}/api/deployments`);
        expect(listed.body.length).toBe(1);
        expect(listed.body[0].running).toBe(true);

        const stopped = await request(`${base}/api/deployments/stop`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
        });
        expect(stopped.body.stopped).toBe(1);
        expect((await request(`${base}/api/deployments`)).body).toEqual([]);

        await request(`${base}/api/workflows/deploy-a`, { method: 'DELETE' });
        await request(`${base}/api/workflows/deploy-b`, { method: 'DELETE' });
    });

    it('starts, reports and stops deployed workflow schedules', async () => {
        const longSchedule = {
            id: 'schedule-demo',
            name: 'Schedule demo',
            nodes: [{
                id: 'inject_s', name: 'Tick', type: 'inject',
                position: { x: 0, y: 0 },
                config: { trigger: 'interval', interval: 10, intervalUnit: 's', repeatCount: 0, payload: {} }
            }],
            connections: []
        };
        await request(`${base}/api/workflows/schedule-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(longSchedule)
        });
        const started = await request(`${base}/api/workflows/schedule-demo/schedule`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}'
        });
        expect(started.status).toBe(200);
        expect(started.body.running).toBe(true);

        const status = await request(`${base}/api/workflows/schedule-demo/schedule`);
        expect(status.status).toBe(200);
        expect(status.body.running).toBe(true);

        const stopped = await request(`${base}/api/workflows/schedule-demo/schedule`, { method: 'DELETE' });
        expect(stopped.body.stopped).toBe(true);
        expect((await request(`${base}/api/workflows/schedule-demo/schedule`)).status).toBe(404);

        const onceSchedule = {
            ...longSchedule,
            id: 'schedule-once',
            name: 'Schedule once',
            nodes: [{
                id: 'inject_s', name: 'Tick', type: 'inject',
                position: { x: 0, y: 0 },
                config: { trigger: 'interval', interval: 50, intervalUnit: 'ms', repeatCount: 1, payload: {} }
            }]
        };
        await request(`${base}/api/workflows/schedule-once`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(onceSchedule)
        });
        await request(`${base}/api/workflows/schedule-once/schedule`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}'
        });
        let executions: any[] = [];
        for (let attempt = 0; attempt < 40 && !executions.length; attempt++) {
            const list = await request(`${base}/api/executions?workflowId=schedule-once`);
            executions = list.body || [];
            if (!executions.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        expect(executions.length).toBeGreaterThan(0);
        const after = await request(`${base}/api/workflows/schedule-once/schedule`);
        expect(after.body.running).toBe(false);

        await request(`${base}/api/workflows/schedule-demo`, { method: 'DELETE' });
        await request(`${base}/api/workflows/schedule-once`, { method: 'DELETE' });
    });

    it('exposes per-node runtime state through the HTTP API', async () => {
        const definition = {
            id: 'runtime-demo',
            name: 'Runtime demo',
            nodes: [{
                id: 'rate_delay', name: 'Rate', type: 'delay' as const,
                position: { x: 0, y: 0 },
                config: { mode: 'rate', rateCount: 1, rateWindow: 60000, rateAction: 'drop' }
            }],
            connections: []
        };
        await request(`${base}/api/workflows/runtime-demo`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(definition)
        });
        await request(`${base}/api/workflows/runtime-demo/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
        await request(`${base}/api/workflows/runtime-demo/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });

        const runtime = await request(`${base}/api/workflows/runtime-demo/runtime`);
        expect(runtime.status).toBe(200);
        expect(Array.isArray(runtime.body.rate_delay?.rateStamps)).toBe(true);

        const missing = await request(`${base}/api/workflows/missing/runtime`);
        expect(missing.status).toBe(404);

        const cleared = await request(`${base}/api/workflows/runtime-demo/runtime`, { method: 'DELETE' });
        expect(cleared.status).toBe(200);
        const empty = await request(`${base}/api/workflows/runtime-demo/runtime`);
        expect(empty.body).toEqual({});

        await request(`${base}/api/workflows/runtime-demo`, { method: 'DELETE' });
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
