import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { resolveWorkflowValue } from '../src/visual/workflow-runtime';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow message envelope and scopes', () => {
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
            id: 'message-chain',
            name: 'Message chain',
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

    it('exposes msg, flow, global and env to function nodes', async () => {
        const seen: any[] = [];
        const definition = chain([
            { type: 'inject', config: { payload: { value: 1 }, topic: 'start' } },
            {
                type: 'function',
                config: {
                    code: [
                        'flow.count = (flow.count || 0) + 1;',
                        'global.total = (global.total || 0) + 1;',
                        'context.seen.push({ payload: msg.payload, topic: msg.topic, env: env.flavor, flow: flow.count, global: global.total });',
                        'msg.payload = { value: msg.payload.value + 1 };',
                        'msg.topic = "bumped";',
                        'return msg;'
                    ].join('\n')
                }
            }
        ]);

        await service.execute(definition, { seen } as any, { env: { flavor: 'vanilla' } });
        await service.execute(definition, { seen } as any, { env: { flavor: 'vanilla' } });

        expect(seen[0]).toEqual({ payload: { value: 1 }, topic: 'start', env: 'vanilla', flow: 1, global: 1 });
        expect(seen[1].flow).toBe(1);
        expect(seen[1].global).toBe(2);
        expect(service.getGlobalContext().total).toBe(2);
    });

    it('keeps legacy payload results in sync with msg.payload', async () => {
        const definition = chain([
            { type: 'inject', config: { payload: { n: 1 } } },
            { type: 'function', config: { code: 'return { payload: { n: 5 } };' } },
            { type: 'function', config: { code: 'return msg.payload.n;' } }
        ]);
        const result = await service.execute(definition, {});
        const nodes = result.data?.executionState?.nodeStates;
        expect(nodes?.function_2.result?.data?.result).toBe(5);
        expect(nodes?.function_1.result?.data?.msg?.payload).toEqual({ n: 5 });
    });

    it('uses typed message paths in condition nodes', async () => {
        const definition = chain([
            { type: 'inject', config: { payload: { approved: true } } },
            { type: 'condition', config: { field: 'msg.payload.approved', operator: 'truthy' } }
        ]);
        const result = await service.execute(definition, {});
        expect(result.data?.executionState?.nodeStates.condition_1.result?.data?.condition).toBe(true);
    });

    it('exposes Node-RED style flow/global get/set helpers to function nodes', async () => {
        const result = await service.execute(chain([
            {
                type: 'function',
                config: {
                    code: [
                        'global.set("environment", "prod");',
                        'flow.set("count", 5);',
                        'msg.payload = { count: flow.get("count"), env: global.get("environment"), direct: flow.count, stage: env.get("STAGE") };',
                        'return msg;'
                    ].join('\n')
                }
            }
        ]), { env: { STAGE: 'beta' } });
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.function_0.result?.data?.payload)
            .toEqual({ count: 5, env: 'prod', direct: 5, stage: 'beta' });
    });

    it('writes inject properties into the message, flow and global scopes', async () => {
        const result = await service.execute(chain([
            {
                type: 'inject',
                config: {
                    payload: { total: 21 },
                    properties: [
                        { target: 'flow', key: 'tenant', value: 'acme' },
                        { target: 'global', key: 'region', value: 'eu' },
                        { key: 'local', value: 'x' }
                    ]
                }
            },
            {
                type: 'function',
                config: {
                    code: [
                        'msg.payload = {',
                        '  tenant: flow.get("tenant"),',
                        '  region: global.get("region"),',
                        '  local: msg.local,',
                        '  injected: msg.payload.total',
                        '};',
                        'return msg;'
                    ].join('\n')
                }
            }
        ]), {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.function_1.result?.data?.payload)
            .toEqual({ tenant: 'acme', region: 'eu', local: 'x', injected: 21 });
    });

    it('forwards the last message passed to node.send when the code returns nothing', async () => {
        const single = await service.execute(chain([
            {
                type: 'function',
                config: { code: 'msg.payload = "sent"; node.send(msg);' }
            }
        ]), {});
        expect(single.data?.executionState?.nodeStates.function_0.result?.data?.payload).toBe('sent');

        const multiple = await service.execute(chain([
            {
                type: 'function',
                config: {
                    code: [
                        'node.send({ ...msg, payload: "first" });',
                        'node.send({ ...msg, payload: "last" });'
                    ].join('\n')
                }
            }
        ]), {});
        // A DAG run forwards one result; the last send wins.
        expect(multiple.data?.executionState?.nodeStates.function_0.result?.data?.payload).toBe('last');
    });

    it('resolves typed value references from msg/flow/global/env', () => {
        const context: any = {
            msg: { payload: { user: { name: 'Ada' } }, topic: 'users' },
            flow: { count: 2 },
            global: { environment: 'prod' },
            env: { TOKEN: 'secret' }
        };
        expect(resolveWorkflowValue({ type: 'literal', value: 42 }, context)).toBe(42);
        expect(resolveWorkflowValue({ type: 'msg', path: 'payload.user.name' }, context)).toBe('Ada');
        expect(resolveWorkflowValue({ type: 'msg', path: 'topic' }, context)).toBe('users');
        expect(resolveWorkflowValue({ type: 'flow', path: 'count' }, context)).toBe(2);
        expect(resolveWorkflowValue({ type: 'global', path: 'environment' }, context)).toBe('prod');
        expect(resolveWorkflowValue({ type: 'env', path: 'TOKEN' }, context)).toBe('secret');
        expect(resolveWorkflowValue('flow.count', context)).toBe(2);
        expect(resolveWorkflowValue({ some: 'object' }, context)).toEqual({ some: 'object' });
    });
});
