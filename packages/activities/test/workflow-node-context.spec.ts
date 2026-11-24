import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import {
    decodeWorkflowTypedValue,
    encodeWorkflowTypedValue,
    isWorkflowTypedReference,
    resolveWorkflowTypedValue
} from '../src/visual/workflow-typed-value';
import { resolveWorkflowValue } from '../src/visual/workflow-runtime';
import { evaluateWorkflowExpression } from '../src/visual/workflow-expression';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow node-local context', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
        service.clearNodeRuntimeState();
    });

    function definition(): VisualWorkflowDefinition {
        return {
            id: 'node-context',
            name: 'Node context',
            nodes: [
                registry.createNode('function', { x: 0, y: 0 }, {
                    id: 'counter_a',
                    config: {
                        code: [
                            'node.set("count", (node.get("count") || 0) + 1);',
                            'msg.payload = { count: node.get("count"), has: node.has("count") };',
                            'return msg;'
                        ].join('\n')
                    }
                }),
                registry.createNode('function', { x: 0, y: 120 }, {
                    id: 'counter_b',
                    config: {
                        code: [
                            'node.set("count", (node.get("count") || 0) + 1);',
                            'msg.payload = { count: node.get("count") };',
                            'return msg;'
                        ].join('\n')
                    }
                })
            ],
            connections: []
        };
    }

    it('persists node.get/set per workflow and node, isolated between nodes', async () => {
        const doc = definition();
        const first = await service.execute(doc, {});
        const payloadOf = (result: any, nodeId: string) =>
            result.data?.executionState?.nodeStates[nodeId].result?.data?.payload;
        expect(payloadOf(first, 'counter_a')).toEqual({ count: 1, has: true });
        expect(payloadOf(first, 'counter_b')).toEqual({ count: 1 });

        const second = await service.execute(doc, {});
        expect(payloadOf(second, 'counter_a')).toEqual({ count: 2, has: true });
        expect(payloadOf(second, 'counter_b')).toEqual({ count: 2 });

        expect(service.getNodeRuntimeState('node-context')).toEqual({
            counter_a: { count: 2 },
            counter_b: { count: 2 }
        });
        service.clearNodeRuntimeState('node-context');
        const reset = await service.execute(doc, {});
        expect(payloadOf(reset, 'counter_a')).toEqual({ count: 1, has: true });
    });

    it('resolves node-scoped typed values and expressions', async () => {
        expect(resolveWorkflowTypedValue({ type: 'node', path: 'count' }, { node: { count: 5 } } as any))
            .toBe(5);
        expect(resolveWorkflowValue({ type: 'node', path: 'nested.value' }, {
            node: { nested: { value: 'x' } }
        } as any)).toBe('x');
        expect(resolveWorkflowTypedValue({ type: 'node', path: 'missing' }, { node: {} } as any))
            .toBeUndefined();
        expect(await evaluateWorkflowExpression('node.total * 2', { node: { total: 21 } } as any))
            .toBe(42);
        expect(isWorkflowTypedReference({ type: 'node', path: 'count' })).toBe(true);
        expect(decodeWorkflowTypedValue({ type: 'node', path: 'count' }))
            .toEqual({ source: 'node', text: 'count' });
        expect(encodeWorkflowTypedValue('node', 'count'))
            .toEqual({ type: 'node', path: 'count' });
    });
});
