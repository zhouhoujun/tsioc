import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { nextCronTime, parseCron } from '../src/visual/workflow-cron';
import * as http from 'node:http';

describe('Workflow data & trigger nodes', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
    });

    function chain(steps: Array<{ type: any; config?: Record<string, any> }>): VisualWorkflowDefinition {
        const nodes = steps.map((step, index) =>
            registry.createNode(step.type, { x: index * 200, y: 100 }, {
                id: `${step.type}_${index}`,
                config: step.config
            })
        );
        return {
            id: 'data-chain',
            name: 'Data chain',
            nodes,
            connections: nodes.slice(0, -1).map((node, index) => ({
                id: `c${index}`,
                sourceNodeId: node.id,
                sourcePort: 'out',
                targetNodeId: nodes[index + 1].id,
                targetPort: 'in'
            }))
        };
    }

    it('runs inject/filter/sort/map/template/json/function in one chain', async () => {
        const definition = chain([
            { type: 'inject', config: { payload: { items: [{ v: 3 }, { v: 1 }, { v: 2 }] } } },
            { type: 'filter', config: { field: 'items', path: 'v', operator: 'gt', value: 1 } },
            { type: 'sort', config: { field: 'items', path: 'v', order: 'asc' } },
            { type: 'map', config: { field: 'items', path: 'v' } },
            { type: 'template', config: { template: '{{items}}', target: 'message' } },
            { type: 'json', config: { mode: 'stringify', field: 'items', pretty: false } },
            { type: 'function', config: { code: 'return { sum: input.items.reduce((a, b) => a + b, 0) };' } }
        ]);
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(result.success).toBe(true);
        expect(states.map_3.status).toBe('success');
        expect(states.function_6.status).toBe('success');
        expect(result.data?.executionState?.nodeStates.inject_0.status).toBe('success');

        const filterResult = result.data?.executionState?.nodeStates.filter_1;
        const mapResult = result.data?.executionState?.nodeStates.map_3;
        const templateResult = result.data?.executionState?.nodeStates.template_4;
        const jsonResult = result.data?.executionState?.nodeStates.json_5;
        const functionResult = result.data?.executionState?.nodeStates.function_6;
        expect(filterResult?.result?.data.items.map((item: any) => item.v)).toEqual([3, 2]);
        expect(mapResult?.result?.data.items).toEqual([2, 3]);
        expect(templateResult?.result?.data.message).toBe('2,3');
        expect(jsonResult?.result?.data.value).toBe('[2,3]');
        expect(functionResult?.result?.data.sum).toBe(5);
    });

    it('generates ranges and batches', async () => {
        const rangeResult = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'range', config: { from: 1, to: 6, step: 2 } }
        ]), {});
        expect(rangeResult.data?.executionState?.nodeStates.range_1.result?.data.items).toEqual([1, 3, 5]);

        const batchResult = await service.execute(chain([
            { type: 'inject', config: { payload: { items: [1, 2, 3, 4, 5] } } },
            { type: 'batch', config: { field: 'items', size: 2 } }
        ]), {});
        expect(batchResult.data?.executionState?.nodeStates.batch_1.result?.data.items).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('splits strings and emits trigger payloads', async () => {
        const splitResult = await service.execute(chain([
            { type: 'inject', config: { payload: { text: 'a,b,c' } } },
            { type: 'split', config: { field: 'text', delimiter: ',' } }
        ]), {});
        expect(splitResult.data?.executionState?.nodeStates.split_1.result?.data.items).toEqual(['a', 'b', 'c']);

        const triggerResult = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'trigger', config: { delay: 5, payload: { ok: true } } }
        ]), {});
        expect(triggerResult.data?.executionState?.nodeStates.trigger_1.result?.data.ok).toBe(true);
        expect(triggerResult.data?.executionState?.nodeStates.trigger_1.result?.data.triggered).toBe(true);
    });

    it('injects timestamps and environment values', async () => {
        const before = Date.now();
        const timestamp = await service.execute(chain([
            { type: 'inject', config: { payloadType: 'timestamp' } }
        ]), {});
        const stamp = timestamp.data?.executionState?.nodeStates.inject_0.result?.data?.payload;
        expect(typeof stamp).toBe('number');
        expect(stamp).toBeGreaterThanOrEqual(before);

        const fromEnv = await service.execute(chain([
            { type: 'inject', config: { payloadType: 'env', payloadValue: 'REGION' } }
        ]), { env: { REGION: 'eu' } });
        expect(fromEnv.data?.executionState?.nodeStates.inject_0.result?.data?.payload).toBe('eu');

        const missing = await service.execute(chain([
            { type: 'inject', config: { payloadType: 'env', payloadValue: 'MISSING' } }
        ]), {});
        expect(missing.success).toBe(false);
        expect(missing.error?.message).toContain('Environment variable');
    });

    it('supports workflows whose entry is an inject trigger', () => {
        const definition = chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'comment', config: { text: 'note' } }
        ]);
        expect(service.validate(definition).valid).toBe(true);
    });

    it('carries the configured inject topic', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 1 }, topic: 'demo/topic' } }
        ]), {});
        const inject = result.data?.executionState?.nodeStates.inject_0;
        expect(inject?.result?.data?.topic).toBe('demo/topic');
        expect(inject?.result?.data?.value).toBe(1);
    });

    it('uses a random delay when the delay node is configured for random mode', async () => {
        const result = await service.execute(chain([
            { type: 'delay', config: { mode: 'random', randomMin: 5, randomMax: 5 } }
        ]), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.delay_0.result?.data?.delayed).toBe(5);
        expect(result.data?.executionState?.nodeStates.delay_0.result?.data?.mode).toBe('random');
    });

    it('renders plain templates and parses JSON output', async () => {
        const plain = await service.execute(chain([
            { type: 'template', config: { template: 'Hello {{name}}', syntax: 'plain', target: 'message' } }
        ]), { name: 'demo' });
        expect(plain.data?.executionState?.nodeStates.template_0.result?.data?.message).toBe('Hello {{name}}');

        const json = await service.execute(chain([
            { type: 'template', config: { template: '{"ok":true}', syntax: 'plain', output: 'json', target: 'message' } }
        ]), {});
        expect(json.data?.executionState?.nodeStates.template_0.result?.data?.message).toEqual({ ok: true });
    });

    it('logs the complete context when requested', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 42 } } },
            { type: 'log', config: { complete: true } }
        ]), {});
        const message = result.data?.executionState?.nodeStates.log_1.result?.data?.message;
        expect(String(message)).toContain('"value":42');
    });

    it('logs a context property when one is configured', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 42 } } },
            { type: 'log', config: { field: 'value' } }
        ]), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.log_1.result?.data?.message).toBe('42');
    });

    it('resolves HTTP authentication from stored credentials', async () => {
        const server = http.createServer((request, response) => {
            response.setHeader('content-type', 'text/plain');
            response.end(String(request.headers.authorization || ''));
        });
        await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
        const port = (server.address() as any).port;
        service.setCredentialResolver(name => name === 'api-token' ? 'secret-token' : undefined);
        try {
            const url = `http://127.0.0.1:${port}`;
            const authorized = await service.execute(chain([
                {
                    type: 'http-request',
                    config: {
                        url,
                        authType: 'bearer',
                        token: '{{credential:api-token}}',
                        responseType: 'text'
                    }
                }
            ]), {});
            expect(authorized.data?.executionState?.nodeStates['http-request_0'].result?.data?.body)
                .toBe('Bearer secret-token');

            const missing = await service.execute(chain([
                {
                    type: 'http-request',
                    config: { url, authType: 'bearer', token: '{{credential:missing}}' }
                }
            ]), {});
            expect(missing.success).toBe(false);
            expect(String(missing.error?.message || '')).toContain('Credential not found');
        } finally {
            await new Promise<void>(resolve => server.close(() => resolve()));
        }
    });

    it('parses HTTP responses as auto, JSON or text', async () => {
        const url = 'data:application/json,%7B%22ok%22%3Atrue%7D';
        const auto = await service.execute(chain([
            { type: 'http-request', config: { url, responseType: 'auto' } }
        ]), {});
        expect(auto.data?.executionState?.nodeStates['http-request_0'].result?.data?.body).toEqual({ ok: true });

        const text = await service.execute(chain([
            { type: 'http-request', config: { url, responseType: 'text' } }
        ]), {});
        expect(text.data?.executionState?.nodeStates['http-request_0'].result?.data?.body).toBe('{"ok":true}');

        const invalid = await service.execute(chain([
            { type: 'http-request', config: { url: 'data:text/plain,not-json', responseType: 'json' } }
        ]), {});
        expect(invalid.success).toBe(false);
    });

    it('runs generic junction, sequence and debug nodes', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 7 } } },
            { type: 'junction' },
            { type: 'sequence' },
            { type: 'debug', config: { field: 'value' } }
        ]), {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(result.success).toBe(true);
        expect(states.junction_1.status).toBe('success');
        expect(states.sequence_2.status).toBe('success');
        expect(states.debug_3.result?.data?.message).toBe('7');
    });

    it('resolves sub-workflows by id through the host resolver', async () => {
        const child: VisualWorkflowDefinition = {
            id: 'child-flow',
            name: 'Child flow',
            nodes: [
                registry.createNode('function', { x: 0, y: 0 }, {
                    id: 'child_fn',
                    config: { code: 'global.childRuns = (global.childRuns || 0) + 1; return {};' }
                })
            ],
            connections: []
        };
        service.setDefinitionResolver(id => id === 'child-flow' ? child : undefined);

        const subprocess = await service.execute(chain([
            { type: 'subprocess', config: { workflow: 'child-flow' } }
        ]), {});
        expect(subprocess.success).toBe(true);
        expect(service.getGlobalContext().childRuns).toBe(1);

        const loop = await service.execute(chain([
            { type: 'loop', config: { workflow: 'child-flow', iterations: 2 } }
        ]), {});
        expect(loop.success).toBe(true);
        expect(service.getGlobalContext().childRuns).toBe(3);

        const missing = await service.execute(chain([
            { type: 'subprocess', config: { workflow: 'missing-flow' } }
        ]), {});
        expect(missing.success).toBe(false);
        expect(String(missing.error?.message || '')).toContain('not found');
    });

    it('maps sub-workflow input and output ports', async () => {
        const child: VisualWorkflowDefinition = {
            id: 'port-child',
            name: 'Port child',
            nodes: [
                registry.createNode('function', { x: 0, y: 0 }, {
                    id: 'child_fn',
                    config: { code: 'return { total: (input.orderId || 0) * 2 };' }
                })
            ],
            connections: []
        };
        service.setDefinitionResolver(id => id === 'port-child' ? child : undefined);

        const result = await service.execute(chain([
            {
                type: 'subprocess',
                config: {
                    workflow: 'port-child',
                    inputs: { orderId: 'payload.id' },
                    outputs: { total: 'total' }
                }
            }
        ]), { payload: { id: 21 } });
        expect(result.success).toBe(true);
        const state = result.data?.executionState?.nodeStates['subprocess_0'];
        expect(state?.result?.data?.msg).toEqual({ total: 42 });
        expect(state?.result?.data?.payload).toEqual({ total: 42 });

        // No mapping keeps the previous behaviour (whole context passes through).
        const passthrough = await service.execute(chain([
            { type: 'subprocess', config: { workflow: 'port-child' } }
        ]), { payload: { id: 3 } });
        expect(passthrough.success).toBe(true);
        expect(passthrough.data?.executionState?.nodeStates['subprocess_0']?.result?.data?.msg)
            .toBeUndefined();
    });

    it('runs a sub-workflow repeatedly with the loop node', async () => {
        const state = { count: 0 };
        const child: VisualWorkflowDefinition = {
            id: 'loop-child',
            name: 'Loop child',
            nodes: [
                registry.createNode('function', { x: 0, y: 0 }, { id: 'child_fn', config: { code: 'context.state.count += 1; return {};' } })
            ],
            connections: []
        };
        const result = await service.execute(chain([
            { type: 'loop', config: { workflow: 'workflows.child', iterations: 3 } }
        ]), { state, workflows: { child } });
        expect(result.success).toBe(true);
        expect(state.count).toBe(3);
        expect(result.data?.executionState?.nodeStates.loop_0.result?.data?.count).toBe(3);
    });

    it('stops a loop when a sub-workflow fails', async () => {
        const child: VisualWorkflowDefinition = {
            id: 'loop-child-failing',
            name: 'Loop child failing',
            nodes: [
                registry.createNode('task', { x: 0, y: 0 }, { id: 'child_fail', config: { fail: true } })
            ],
            connections: []
        };
        const result = await service.execute(chain([
            { type: 'loop', config: { workflow: 'workflows.child', iterations: 5 } }
        ]), { workflows: { child } });
        expect(result.success).toBe(false);
        expect(result.data?.executionState?.nodeStates.loop_0.result?.data?.count).toBe(1);
        expect(String(result.data?.executionState?.nodeStates.loop_0.result?.error || '')).toContain('failed');
    });

    it('runs complete, catch and status lifecycle nodes', async () => {
        const successState: any = {};
        const success: VisualWorkflowDefinition = {
            id: 'complete-demo',
            name: 'Complete demo',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { ok: true } } }),
                registry.createNode('task', { x: 200, y: 0 }, { id: 'task_1', config: { result: { ok: true } } }),
                registry.createNode('complete', { x: 0, y: 160 }, { id: 'complete_1', config: { scope: 'other, task_1' } }),
                registry.createNode('function', { x: 200, y: 160 }, { id: 'complete_fn', config: { code: 'context.state.complete = true; context.state.completedNodeId = context.completedNodeId; return {};' } }),
                registry.createNode('status', { x: 0, y: 320 }, { id: 'status_1' }),
                registry.createNode('function', { x: 200, y: 320 }, { id: 'status_fn', config: { code: 'context.state.status = context.workflowStatus; return {};' } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'task_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'complete_1', sourcePort: 'out', targetNodeId: 'complete_fn', targetPort: 'in' },
                { id: 'c3', sourceNodeId: 'status_1', sourcePort: 'out', targetNodeId: 'status_fn', targetPort: 'in' }
            ]
        };
        const successResult = await service.execute(success, { state: successState });
        expect(successResult.success).toBe(true);
        expect(successState.complete).toBe(true);
        expect(successState.completedNodeId).toBe('task_1');
        expect(successState.status).toBe('completed');

        const failState: any = {};
        const failure: VisualWorkflowDefinition = {
            id: 'catch-demo',
            name: 'Catch demo',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: {} } }),
                registry.createNode('task', { x: 200, y: 0 }, { id: 'task_1', config: { fail: true } }),
                registry.createNode('catch', { x: 0, y: 160 }, { id: 'catch_1', config: { scope: 'other, task_1' } }),
                registry.createNode('function', { x: 200, y: 160 }, { id: 'catch_fn', config: { code: 'context.state.caught = true; context.state.failedNodeId = context.failedNodeId; context.state.errorMessage = context.errorMessage; return {};' } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'task_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'catch_1', sourcePort: 'out', targetNodeId: 'catch_fn', targetPort: 'in' }
            ]
        };
        const failureResult = await service.execute(failure, { state: failState });
        expect(failureResult.success).toBe(false);
        expect(failState.caught).toBe(true);
        expect(failState.failedNodeId).toBe('task_1');
        expect(failState.errorMessage).toBeTruthy();
    });

    it('computes cron schedules for inject triggers', () => {
        const quarter = nextCronTime('*/15 * * * *', new Date(2026, 0, 1, 0, 7));
        expect(quarter?.getHours()).toBe(0);
        expect(quarter?.getMinutes()).toBe(15);

        const weekday = nextCronTime('0 9 * * 1-5', new Date(2026, 0, 2, 10, 0));
        expect(weekday?.getDay()).toBe(1);
        expect(weekday?.getHours()).toBe(9);
        expect(weekday?.getMinutes()).toBe(0);

        expect(parseCron('0 9 * * 1-5').hours.has(9)).toBe(true);
        expect(() => parseCron('broken')).toThrow();
    });

    it('supports event-triggered injection', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { trigger: 'event', event: 'order.created', timeout: 1 } }
        ]), {
            eventBus: {
                wait: async (event: string) => event === 'order.created' ? { value: 42 } : undefined
            }
        });
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.inject_0.result?.data?.value).toBe(42);
    });

    it('schedules interval injection until stopped', async () => {
        const state = { count: 0 };
        const context: any = { state };
        const definition = chain([
            { type: 'inject', config: { trigger: 'interval', interval: 5, intervalUnit: 'ms', repeatCount: 2 } },
            { type: 'function', config: { code: 'context.state.count += 1; return {};' } }
        ]);
        const results: any[] = [];
        const handle = service.startSchedule(definition, {
            context,
            onResult: result => results.push(result)
        });
        await new Promise(resolve => setTimeout(resolve, 150));
        handle.stop();
        expect(results.length).toBe(2);
        expect(state.count).toBe(2);
    });

    it('supports typed inject payloads and disabled debug output', async () => {
        const text = await service.execute(chain([
            { type: 'inject', config: { payloadType: 'string', payload: 'hello' } }
        ]), {});
        expect(text.data?.executionState?.nodeStates.inject_0.result?.data?.payload).toBe('hello');

        const number = await service.execute(chain([
            { type: 'inject', config: { payloadType: 'number', payload: '42' } }
        ]), {});
        expect(number.data?.executionState?.nodeStates.inject_0.result?.data?.payload).toBe(42);

        const debug = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 1 } } },
            { type: 'debug', config: { active: false } }
        ]), {});
        expect(debug.data?.executionState?.nodeStates.debug_1.result?.data?.skipped).toBe(true);
    });

    it('supports delay units and overlapping batches', async () => {
        const delay = await service.execute(chain([
            { type: 'delay', config: { mode: 'random', unit: 's', randomMin: 0.01, randomMax: 0.01 } }
        ]), {});
        expect(delay.data?.executionState?.nodeStates.delay_0.result?.data?.delayed).toBe(10);

        const batch = await service.execute(chain([
            { type: 'inject', config: { payload: { items: [1, 2, 3, 4, 5] } } },
            { type: 'batch', config: { field: 'items', size: 3, overlap: 1 } }
        ]), {});
        expect(batch.data?.executionState?.nodeStates.batch_1.result?.data?.items).toEqual([
            [1, 2, 3],
            [3, 4, 5]
        ]);
    });

    it('extracts HTML by tag and sends Basic auth headers', async () => {
        const html = await service.execute(chain([
            { type: 'inject', config: { payload: { value: '<h1>A</h1><h1>B</h1>' } } },
            { type: 'html', config: { field: 'value', mode: 'text', tag: 'h1' } }
        ]), {});
        expect(html.data?.executionState?.nodeStates.html_1.result?.data?.value).toEqual(['A', 'B']);

        const original = (globalThis as any).fetch;
        let captured: any;
        (globalThis as any).fetch = async (url: string, init: any) => {
            captured = { url, init };
            return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
        };
        try {
            const request = await service.execute(chain([
                { type: 'http-request', config: {
                    url: 'https://example.com/api',
                    authType: 'basic',
                    username: 'user',
                    password: 'pass',
                    followRedirects: false
                } }
            ]), {});
            expect(request.success).toBe(true);
            const httpState: any = Object.entries(request.data?.executionState?.nodeStates || {})
                .find(([id]) => id.startsWith('http-request'))?.[1];
            expect(httpState?.result?.data?.statusCode).toBe(200);
            expect(httpState?.result?.data?.responseUrl).toBe('https://example.com/api');
            expect(httpState?.result?.data?.headers?.['content-type']).toBe('application/json');
        } finally {
            (globalThis as any).fetch = original;
        }
        expect(captured.init.redirect).toBe('manual');
        expect(captured.init.headers.Authorization).toBe(`Basic ${Buffer.from('user:pass').toString('base64')}`);
    });

    it('routes to numbered outputs with ordered rules', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'router-demo',
            name: 'Router demo',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { status: 'ok' } } }),
                registry.createNode('router', { x: 200, y: 0 }, { id: 'router_1', config: { field: 'status', rules: [
                    { operator: 'equals', value: 'bad' },
                    { operator: 'equals', value: 'ok' }
                ] } }),
                registry.createNode('task', { x: 400, y: -60 }, { id: 'task_ok', config: { result: { routed: true } } }),
                registry.createNode('task', { x: 400, y: 120 }, { id: 'task_fallback', config: { result: { fallback: true } } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'router_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'router_1', sourcePort: 'route-2', targetNodeId: 'task_ok', targetPort: 'in' },
                { id: 'c3', sourceNodeId: 'router_1', sourcePort: 'default', targetNodeId: 'task_fallback', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(states.router_1.result?.data?.route).toBe(2);
        expect(states.task_ok.status).toBe('success');
        expect(states.task_fallback.status).toBe('skipped');
    });

    it('routes switch rules to numbered outputs', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'switch-demo',
            name: 'Switch demo',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { level: 7 } } }),
                registry.createNode('switch', { x: 200, y: 0 }, { id: 'switch_1', config: { field: 'level', rules: [
                    { operator: 'gt', value: '10' },
                    { operator: 'gte', value: '5' }
                ] } }),
                registry.createNode('task', { x: 400, y: -60 }, { id: 'task_match', config: { result: { matched: true } } }),
                registry.createNode('task', { x: 400, y: 120 }, { id: 'task_default', config: { result: { fallback: true } } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'switch_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'switch_1', sourcePort: 'route-2', targetNodeId: 'task_match', targetPort: 'in' },
                { id: 'c3', sourceNodeId: 'switch_1', sourcePort: 'default', targetNodeId: 'task_default', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(states.switch_1.result?.data?.route).toBe(2);
        expect(states.task_match.status).toBe('success');
    });

    it('passes ordered command arguments', async () => {
        let received: any;
        const result = await service.execute(chain([
            { type: 'command', config: { command: 'demo', args: [{ value: '--flag' }, { value: 'value' }] } }
        ]), {
            exec: async (_command: string, args: any[]) => {
                received = args;
                return { ok: true };
            }
        });
        expect(result.success).toBe(true);
        expect(received).toEqual(['--flag', 'value']);
    });

    it('runs function initialize and finalize code', async () => {
        const result = await service.execute(chain([
            { type: 'function', config: {
                initialize: 'return { ready: true };',
                code: 'return { seen: input.ready };',
                finalize: 'context.finalized = true;'
            } }
        ]), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.function_0.result?.data?.seen).toBe(true);
    });

    it('combines multiple context values', async () => {
        const merged = await service.execute(chain([
            { type: 'inject', config: { payload: { a: { x: 1 }, b: { y: 2 } } } },
            { type: 'combine', config: { fields: 'a, b', mode: 'merge' } }
        ]), {});
        expect(merged.data?.executionState?.nodeStates.combine_1.result?.data?.value).toEqual({ x: 1, y: 2 });

        const concat = await service.execute(chain([
            { type: 'inject', config: { payload: { a: [1, 2], b: [3] } } },
            { type: 'combine', config: { fields: 'a, b', mode: 'concat' } }
        ]), {});
        expect(concat.data?.executionState?.nodeStates.combine_1.result?.data?.value).toEqual([1, 2, 3]);

        const text = await service.execute(chain([
            { type: 'inject', config: { payload: { a: 'hello', b: 'world' } } },
            { type: 'combine', config: { fields: 'a, b', mode: 'text', separator: ' ' } }
        ]), {});
        expect(text.data?.executionState?.nodeStates.combine_1.result?.data?.value).toBe('hello world');
    });

    it('routes switch rules past the fourth output', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'switch-eight',
            name: 'Switch eight',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { level: 7 } } }),
                registry.createNode('switch', { x: 200, y: 0 }, { id: 'switch_1', config: {
                    field: 'level',
                    rules: [
                        { operator: 'is-empty' },
                        { operator: 'is-empty' },
                        { operator: 'is-empty' },
                        { operator: 'is-empty' },
                        { operator: 'is-empty' },
                        { operator: 'is-empty' },
                        { operator: 'is-empty' },
                        { operator: 'equals', value: '7' }
                    ]
                } }),
                registry.createNode('task', { x: 400, y: 0 }, { id: 'task_eighth', config: { result: { eighth: true } } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'switch_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'switch_1', sourcePort: 'route-8', targetNodeId: 'task_eighth', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(states.switch_1.result?.data?.route).toBe(8);
        expect(states.task_eighth.status).toBe('success');
    });

    it('matches every switch rule when check-all is enabled and supports else', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'switch-checkall',
            name: 'Switch check all',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { level: 7 } } }),
                registry.createNode('switch', { x: 200, y: 0 }, { id: 'switch_1', config: {
                    field: 'level',
                    checkAll: true,
                    rules: [
                        { operator: 'gt', value: '5' },
                        { operator: 'lte', value: '10' },
                        { operator: 'gt', value: '100' },
                        { operator: 'else' }
                    ]
                } }),
                registry.createNode('task', { x: 400, y: -80 }, { id: 'task_a', config: { result: { a: true } } }),
                registry.createNode('task', { x: 400, y: 0 }, { id: 'task_b', config: { result: { b: true } } }),
                registry.createNode('task', { x: 400, y: 80 }, { id: 'task_default', config: { result: { d: true } } })
            ],
            connections: [
                { id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out', targetNodeId: 'switch_1', targetPort: 'in' },
                { id: 'c2', sourceNodeId: 'switch_1', sourcePort: 'route-1', targetNodeId: 'task_a', targetPort: 'in' },
                { id: 'c3', sourceNodeId: 'switch_1', sourcePort: 'route-2', targetNodeId: 'task_b', targetPort: 'in' },
                { id: 'c4', sourceNodeId: 'switch_1', sourcePort: 'default', targetNodeId: 'task_default', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(states.switch_1.result?.data?.routes).toEqual([1, 2]);
        expect(states.task_a.status).toBe('success');
        expect(states.task_b.status).toBe('success');
        expect(states.task_default.status).toBe('skipped');

        const fallback = await service.execute(chain([
            { type: 'inject', config: { payload: { level: 7 } } },
            { type: 'switch', config: {
                field: 'level',
                rules: [
                    { operator: 'is-empty' },
                    { operator: 'else' }
                ]
            } }
        ]), {});
        expect(fallback.data?.executionState?.nodeStates.switch_1.result?.data?.route).toBe(2);
    });

    it('lets msg.delay override a fixed delay', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { delay: 10 } } },
            { type: 'delay', config: { mode: 'fixed', delay: 500, override: true } }
        ]), {});
        const state = result.data?.executionState?.nodeStates.delay_1;
        expect(state?.result?.data?.delayed).toBe(10);

        const ignored = await service.execute(chain([
            { type: 'inject', config: { payload: { delay: 10 } } },
            { type: 'delay', config: { mode: 'fixed', delay: 0, override: false } }
        ]), {});
        expect(ignored.data?.executionState?.nodeStates.delay_1.result?.data?.delayed).toBe(0);
    });

    it('parses and stringifies YAML and filters RBE changes', async () => {
        const parsed = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 'name: Ada\nitems:\n  - 1\n  - 2' } } },
            { type: 'yaml', config: { field: 'value', mode: 'parse' } }
        ]), {});
        const yamlValue = parsed.data?.executionState?.nodeStates.yaml_1.result?.data?.value;
        expect(yamlValue.name).toBe('Ada');
        expect(yamlValue.items).toEqual([1, 2]);

        const stringified = await service.execute(chain([
            { type: 'inject', config: { payload: { data: { ok: true, count: 2 } } } },
            { type: 'yaml', config: { field: 'data', mode: 'stringify', target: 'text' } }
        ]), {});
        expect(String(stringified.data?.executionState?.nodeStates.yaml_1.result?.data?.text)).toContain('ok: true');

        const filtered = await service.execute(chain([
            { type: 'inject', config: { payload: { items: [{ v: 1 }, { v: 1 }, { v: 2 }, { v: 2 }, { v: 1 }] } } },
            { type: 'rbe', config: { field: 'items', path: 'v' } }
        ]), {});
        expect(filtered.data?.executionState?.nodeStates.rbe_1.result?.data?.items).toEqual([
            { v: 1 }, { v: 2 }, { v: 1 }
        ]);

        const anyChange = await service.execute(chain([
            { type: 'inject', config: { payload: { items: [{ v: 1, x: 'a' }, { v: 1, x: 'b' }, { v: 1, x: 'b' }, { v: 2, x: 'c' }] } } },
            { type: 'rbe', config: { field: 'items', path: 'v', mode: 'change' } }
        ]), {});
        expect(anyChange.data?.executionState?.nodeStates.rbe_1.result?.data?.items).toEqual([
            { v: 1, x: 'a' }, { v: 1, x: 'b' }, { v: 2, x: 'c' }
        ]);

        const ignoreFirst = await service.execute(chain([
            { type: 'inject', config: { payload: { items: [{ v: 1 }, { v: 2 }, { v: 3 }] } } },
            { type: 'rbe', config: { field: 'items', path: 'v', ignoreFirst: true } }
        ]), {});
        expect(ignoreFirst.data?.executionState?.nodeStates.rbe_1.result?.data?.items).toEqual([
            { v: 2 }, { v: 3 }
        ]);
    });

    it('rate-limits delay nodes across executions', async () => {
        let calls = 0;
        const context = {
            actions: {
                record: () => {
                    calls += 1;
                    return { calls };
                }
            }
        };
        const definition = chain([
            { type: 'inject', config: { payload: { value: 1 } } },
            { type: 'delay', config: { mode: 'rate', rateCount: 1, rateWindow: 60000, rateAction: 'drop' } },
            { type: 'task', config: { action: 'record' } }
        ]);

        const first = await service.execute(definition, context);
        expect(first.success).toBe(true);
        expect(calls).toBe(1);
        expect(first.data?.executionState?.nodeStates.delay_1.result?.data?.mode).toBe('rate');

        const second = await service.execute(definition, context);
        const snapshot = second.data?.executionState;
        expect(calls).toBe(1);
        expect(snapshot.nodeStates.delay_1.result?.data?.dropped).toBe(true);
        expect(snapshot.nodeStates.task_2.status).toBe('skipped');
        const runtime = service.getNodeRuntimeState(definition.id);
        expect(Array.isArray(runtime.delay_1?.rateStamps)).toBe(true);
        expect(service.getNodeRuntimeState('other-workflow')).toEqual({});
        service.clearNodeRuntimeState(definition.id);
        expect(service.getNodeRuntimeState(definition.id)).toEqual({});
    });

    it('queues rate-limited messages until the window opens', async () => {
        let calls = 0;
        const context = {
            actions: {
                record: () => {
                    calls += 1;
                    return { calls };
                }
            }
        };
        const definition = chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'delay', config: { mode: 'rate', rateCount: 1, rateWindow: 80, rateAction: 'queue' } },
            { type: 'task', config: { action: 'record' } }
        ]);
        await service.execute(definition, context);
        const started = Date.now();
        const second = await service.execute(definition, context);
        const elapsed = Date.now() - started;
        expect(second.success).toBe(true);
        expect(calls).toBe(2);
        expect(elapsed).toBeGreaterThanOrEqual(60);
    });

    it('restarts a pending trigger delay when a newer message arrives', async () => {
        let calls = 0;
        const context = {
            actions: {
                record: () => {
                    calls += 1;
                    return { calls };
                }
            }
        };
        const definition = chain([
            { type: 'trigger', config: { delay: 120, newMessage: 'restart', payload: { n: 1 } } },
            { type: 'task', config: { action: 'record' } }
        ]);

        const firstPromise = service.execute(definition, context);
        await new Promise(resolve => setTimeout(resolve, 30));
        const secondPromise = service.execute(definition, context);
        const [first, second] = await Promise.all([firstPromise, secondPromise]);

        expect(calls).toBe(1);
        expect(first.data?.executionState?.nodeStates.trigger_0.result?.data?.dropped).toBe(true);
        expect(first.data?.executionState?.nodeStates.task_1.status).toBe('skipped');
        expect(second.data?.executionState?.nodeStates.task_1.status).toBe('success');
    });

    it('emits a second trigger message and runs the branch again', async () => {
        const messages: Array<{ step: any; emission: number }> = [];
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'trigger', config: { delay: 0, payload: { step: 1 }, emitSecond: true, secondDelay: 5, secondPayload: { step: 2 } } },
            { type: 'task', config: { action: 'record' } }
        ]), {
            actions: {
                record: (ctx: any) => {
                    messages.push({ step: ctx.step, emission: ctx.emission });
                    return ctx.step;
                }
            }
        });
        expect(result.success).toBe(true);
        expect(messages).toEqual([{ step: 1, emission: 1 }, { step: 2, emission: 2 }]);
        const snapshot = result.data?.executionState;
        expect(snapshot.edgeStates.c1.count).toBe(2);
        expect(snapshot.nodeStates.task_2.result?.data?.result).toBe(2);
    });

    it('cancels a pending trigger emission when msg.reset arrives', async () => {
        let calls = 0;
        const context = {
            actions: {
                record: () => {
                    calls += 1;
                    return calls;
                }
            }
        };
        const definition = chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'trigger', config: { delay: 300, payload: { step: 1 } } },
            { type: 'task', config: { action: 'record' } }
        ]);
        const first = service.execute(definition, context);
        await new Promise(resolve => setTimeout(resolve, 80));
        const reset = await service.execute(definition, { ...context, reset: true });
        const firstResult = await first;
        await new Promise(resolve => setTimeout(resolve, 320));

        expect(calls).toBe(0);
        expect(firstResult.data?.executionState?.nodeStates.trigger_1.result?.data?.reset).toBe(true);
        expect(firstResult.data?.executionState?.nodeStates.task_2.status).toBe('skipped');
        expect(reset.data?.executionState?.nodeStates.trigger_1.result?.data?.reset).toBe(true);
        expect(reset.data?.executionState?.nodeStates.task_2.status).toBe('skipped');
    });

    it('extends the pending trigger delay instead of emitting twice', async () => {
        let calls = 0;
        const context = {
            actions: {
                record: () => {
                    calls += 1;
                    return calls;
                }
            }
        };
        const definition = chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'trigger', config: { delay: 80, newMessage: 'extend', payload: { step: 1 } } },
            { type: 'task', config: { action: 'record' } }
        ]);
        const first = service.execute(definition, context);
        await new Promise(resolve => setTimeout(resolve, 30));
        const second = await service.execute(definition, context);
        const firstResult = await first;

        expect(firstResult.data?.executionState?.nodeStates.trigger_1.result?.data?.superseded).toBe(true);
        expect(firstResult.data?.executionState?.nodeStates.trigger_1.result?.data?.triggered).toBe(false);
        expect(second.data?.executionState?.nodeStates.trigger_1.result?.data?.triggered).toBe(true);
        expect(calls).toBe(1);
    });

    it('fails HTTP requests without a URL instead of skipping them', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'http-request', config: {} }
        ]), {});
        const node = result.data?.executionState?.nodeStates['http-request_1'];
        expect(result.success).toBe(false);
        expect(node.status).toBe('failed');
        expect(node.result?.error).toContain('URL is required');
    });

    it('scales numbers between ranges', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 50 } } },
            { type: 'scale', config: { field: 'value', inMin: 0, inMax: 100, outMin: 0, outMax: 1 } }
        ]), {});
        expect(result.data?.executionState?.nodeStates.scale_1.result?.data?.value).toBe(0.5);

        const clamped = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 150 } } },
            { type: 'scale', config: { field: 'value', inMin: 0, inMax: 100, outMin: 0, outMax: 10, round: true } }
        ]), {});
        expect(clamped.data?.executionState?.nodeStates.scale_1.result?.data?.value).toBe(10);
    });

    it('honours XML attribute/text options and CSV columns', async () => {
        const xml = await service.execute(chain([
            { type: 'inject', config: { payload: { value: '<root><item id="1">A</item></root>' } } },
            { type: 'xml', config: { field: 'value', mode: 'parse', attributes: false, text: false } }
        ]), {});
        const parsed = xml.data?.executionState?.nodeStates.xml_1.result?.data?.value;
        expect(parsed.root.item['@attrs']).toBeUndefined();
        expect(parsed.root.item['#text']).toBeUndefined();

        const csv = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 'name,age\nA,10\nB,20' } } },
            { type: 'csv', config: { field: 'value', mode: 'parse', header: true, columns: 'name' } }
        ]), {});
        expect(csv.data?.executionState?.nodeStates.csv_1.result?.data?.value).toEqual([{ name: 'A' }, { name: 'B' }]);

        const numeric = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 'name,age\nA,10\nB,20' } } },
            { type: 'csv', config: { field: 'value', mode: 'parse', header: true, parseNumbers: true } }
        ]), {});
        expect(numeric.data?.executionState?.nodeStates.csv_1.result?.data?.value).toEqual([
            { name: 'A', age: 10 },
            { name: 'B', age: 20 }
        ]);
    });

    it('extracts HTML attributes', async () => {
        const result = await service.execute(chain([
            { type: 'inject', config: { payload: { value: '<a href="https://a">A</a><a href="https://b">B</a>' } } },
            { type: 'html', config: { field: 'value', mode: 'attribute', attribute: 'href' } }
        ]), {});
        expect(result.data?.executionState?.nodeStates.html_1.result?.data?.value).toEqual(['https://a', 'https://b']);
    });

    it('applies multiple change rules in order', async () => {
        const result = await service.execute(chain([
            { type: 'change', config: { rules: [
                { action: 'set', field: 'variables.name', value: 'Ada' },
                { action: 'append', field: 'variables.tags', value: 'admin' }
            ] } }
        ]), {});
        const state = result.data?.executionState?.nodeStates.change_0;
        expect(result.success).toBe(true);
        expect(state?.result?.data?.rules).toEqual(['variables.name', 'variables.tags']);

        const moved = await service.execute(chain([
            { type: 'change', config: { rules: [
                { action: 'set', field: 'variables.name', value: 'Ada' },
                { action: 'move', field: 'variables.name', to: 'variables.renamed' },
                { action: 'set', field: 'variables.text', value: 'hello world' },
                { action: 'replace', field: 'variables.text', search: 'world', replace: 'there' }
            ] } }
        ]), {});
        const movedState = moved.data?.executionState?.nodeStates.change_0;
        expect(movedState?.result?.data?.rules).toEqual([
            'variables.name', 'variables.name', 'variables.text', 'variables.text'
        ]);
        const movedContext = movedState?.result?.data?.value;
        expect(movedContext.variables.name).toBeUndefined();
        expect(movedContext.variables.renamed).toBe('Ada');
        expect(movedContext.variables.text).toBe('hello there');

        const fromEnv = await service.execute(chain([
            { type: 'change', config: { rules: [
                { action: 'set', field: 'variables.region', valueFrom: 'env', valuePath: 'REGION' }
            ] } }
        ]), { env: { REGION: 'eu' } });
        expect(fromEnv.data?.executionState?.nodeStates.change_0.result?.data?.value?.variables?.region).toBe('eu');
    });

    it('runs generic link, HTML and XML nodes', async () => {
        const link = await service.execute(chain([
            { type: 'inject', config: { payload: { value: 1 } } },
            { type: 'link', config: { links: 'left, right' } }
        ]), {});
        expect(link.data?.executionState?.nodeStates.link_1.result?.data?.links).toEqual(['left', 'right']);

        const htmlText = await service.execute(chain([
            { type: 'inject', config: { payload: { value: '<p>Hello <a href="https://example.com">X</a></p>' } } },
            { type: 'html', config: { field: 'value', mode: 'text' } }
        ]), {});
        expect(htmlText.data?.executionState?.nodeStates.html_1.result?.data?.value).toBe('Hello X');

        const htmlLinks = await service.execute(chain([
            { type: 'inject', config: { payload: { value: '<a href="https://example.com">X</a>' } } },
            { type: 'html', config: { field: 'value', mode: 'links' } }
        ]), {});
        expect(htmlLinks.data?.executionState?.nodeStates.html_1.result?.data?.value).toEqual(['https://example.com']);

        const xml = await service.execute(chain([
            { type: 'inject', config: { payload: { value: '<root><item id="1">A</item><item id="2">B</item></root>' } } },
            { type: 'xml', config: { field: 'value', mode: 'parse' } }
        ]), {});
        const parsed = xml.data?.executionState?.nodeStates.xml_1.result?.data?.value;
        expect(parsed.root.item.length).toBe(2);
        expect(parsed.root.item[0]['@attrs'].id).toBe('1');
        expect(parsed.root.item[0]['#text']).toBe('A');
    });

    it('runs a plain action node without start or end nodes', async () => {
        const result = await service.execute(chain([
            { type: 'task', config: { result: { ok: true } } }
        ]), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.task_0.status).toBe('success');
    });

    it('runs every disconnected entry node', async () => {
        const definition: VisualWorkflowDefinition = {
            id: 'multi-entry',
            name: 'Multiple entries',
            nodes: [
                registry.createNode('task', { x: 0, y: 0 }, { id: 'left', config: { result: { side: 'left' } } }),
                registry.createNode('task', { x: 0, y: 120 }, { id: 'right', config: { result: { side: 'right' } } })
            ],
            connections: []
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(result.success).toBe(true);
        expect(states.left.status).toBe('success');
        expect(states.right.status).toBe('success');
    });

    it('parses CSV and computes statistics', async () => {
        const csvResult = await service.execute(chain([
            { type: 'inject', config: { payload: { text: 'name,age\nA,10\nB,20' } } },
            { type: 'csv', config: { mode: 'parse', field: 'text', header: true } }
        ]), {});
        const csvValue = csvResult.data?.executionState?.nodeStates.csv_1.result?.data.value;
        expect(csvValue.length).toBe(2);
        expect(csvValue[0]).toEqual({ name: 'A', age: '10' });

        const statsResult = await service.execute(chain([
            { type: 'inject', config: { payload: { items: [{ v: 1 }, { v: 2 }, { v: 3 }] } } },
            { type: 'statistics', config: { field: 'items', path: 'v', operation: 'sum' } }
        ]), {});
        expect(statsResult.data?.executionState?.nodeStates.statistics_1.result?.data.value).toBe(6);

        const mergeResult = await service.execute(chain([
            { type: 'inject', config: { payload: { a: { x: 1 }, b: { y: 2 } } } },
            { type: 'merge', config: { fields: 'a,b', mode: 'object' } }
        ]), {});
        expect(mergeResult.data?.executionState?.nodeStates.merge_1.result?.data.value).toEqual({ x: 1, y: 2 });
    });

    it('changes context fields and executes host commands', async () => {
        const changed = await service.execute(chain([
            { type: 'inject', config: { payload: { variables: {} } } },
            { type: 'change', config: { action: 'set', field: 'variables.name', value: 'workflow' } },
            { type: 'function', config: { code: 'return { name: context.variables.name };' } }
        ]), {});
        expect(changed.data?.executionState?.nodeStates.function_2.result?.data.name).toBe('workflow');

        const command = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'command', config: { command: 'echo', args: ['hello'] } }
        ]), {
            exec: async (name: string, args: any[]) => ({ stdout: `${name}:${args.join(',')}` })
        });
        expect(command.data?.executionState?.nodeStates.command_1.result?.data.stdout).toBe('echo:hello');
    });

    it('emits and waits for workflow events', async () => {
        const emitted: Array<{ event: string; payload: any }> = [];
        const eventBus = {
            emit: (event: string, payload: any) => emitted.push({ event, payload }),
            wait: async (event: string) => ({ event, ok: true })
        };
        const emitResult = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'event-emit', config: { event: 'demo.event', payload: { value: 1 } } }
        ]), { eventBus });
        expect(emitted[0]).toEqual({ event: 'demo.event', payload: { value: 1 } });
        expect(emitResult.data?.executionState?.nodeStates['event-emit_1'].result?.data.emitted).toBe(true);

        const waitResult = await service.execute(chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'event-wait', config: { event: 'demo.event', timeout: 100 } }
        ]), { eventBus });
        expect(waitResult.data?.executionState?.nodeStates['event-wait_1'].result?.data.value).toEqual({ event: 'demo.event', ok: true });
    });
});
