import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import {
    clearWorkflowExpressions,
    evaluateWorkflowExpression,
    preloadWorkflowExpressions,
    setWorkflowExpressionEvaluator
} from '../src/visual/workflow-expression';
import {
    decodeWorkflowTypedValue,
    encodeWorkflowTypedValue,
    isWorkflowTypedReference,
    resolveWorkflowTypedValueAsync,
    validateWorkflowTypedValue
} from '../src/visual/workflow-typed-value';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow expressions (JSONata)', () => {
    const context: any = {
        msg: { payload: { total: 21, name: 'ada' }, topic: 'orders' },
        flow: { threshold: 20 },
        global: { region: 'eu' },
        env: { TOKEN: 'secret' }
    };

    beforeEach(() => {
        clearWorkflowExpressions();
        setWorkflowExpressionEvaluator(undefined);
    });

    afterEach(() => {
        setWorkflowExpressionEvaluator(undefined);
    });

    it('stores expressions as an explicit typed value', () => {
        const stored = encodeWorkflowTypedValue('expression', 'payload.total * 2');
        expect(stored).toEqual({ type: 'expression', value: 'payload.total * 2' });
        expect(decodeWorkflowTypedValue(stored)).toEqual({
            source: 'expression',
            text: 'payload.total * 2'
        });
        expect(isWorkflowTypedReference(stored)).toBe(true);
    });

    it('evaluates against message, flow, global and env scope', async () => {
        expect(await evaluateWorkflowExpression('payload.total * 2', context)).toBe(42);
        expect(await evaluateWorkflowExpression('$uppercase(payload.name)', context)).toBe('ADA');
        expect(await evaluateWorkflowExpression('flow.threshold + 1', context)).toBe(21);
        expect(await evaluateWorkflowExpression('global.region', context)).toBe('eu');
        expect(await evaluateWorkflowExpression('env.TOKEN', context)).toBe('secret');
        expect(await evaluateWorkflowExpression('', context)).toBeUndefined();
    });

    it('reports syntax errors with the expression position', async () => {
        let error: any;
        try {
            await evaluateWorkflowExpression('payload.total +', context);
        } catch (caught) {
            error = caught;
        }
        expect(error).toBeTruthy();
        expect(String(error.message || error)).toMatch(/position|syntax|token|unexpected/i);
    });

    it('lets a host swap the evaluator', async () => {
        setWorkflowExpressionEvaluator({
            evaluate: async (expression: string) => `eval:${expression}`
        });
        expect(await resolveWorkflowTypedValueAsync({ type: 'expression', value: 'x + 1' }, context))
            .toBe('eval:x + 1');
        // Plain values stay unaffected.
        expect(await resolveWorkflowTypedValueAsync({ type: 'msg', path: 'payload.total' }, context))
            .toBe(21);
    });

    it('validates expression syntax once the evaluator is loaded', async () => {
        // Before loading, validation is intentionally silent (the designer does
        // not fetch the language just to typecheck).
        expect(validateWorkflowTypedValue({ type: 'expression', value: 'payload.total +' }))
            .toBeUndefined();

        expect(await preloadWorkflowExpressions()).toBe(true);
        expect(validateWorkflowTypedValue({ type: 'expression', value: 'payload.total + 1' }))
            .toBeUndefined();
        const broken = validateWorkflowTypedValue({ type: 'expression', value: 'payload.total +' });
        expect(broken).toContain('Expression error');
        expect(broken).toMatch(/position|unexpected|token/i);
    });

    describe('runtime', () => {
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
                id: 'expression-chain',
                name: 'Expression chain',
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

        it('compares switch rules against an expression', async () => {
            const result = await service.execute(chain([
                { type: 'inject', config: { payload: { total: 21 } } },
                {
                    type: 'switch',
                    config: {
                        field: 'payload.total',
                        rules: [
                            { operator: 'equals', value: { type: 'expression', value: '21 * 2' } },
                            { operator: 'equals', value: { type: 'expression', value: '21' } }
                        ]
                    }
                }
            ]), {});
            expect(result.success).toBe(true);
            expect(result.data?.executionState?.nodeStates.switch_1.result?.data?.route).toBe(2);
        });

        it('compares condition and filter values against an expression', async () => {
            const condition = await service.execute(chain([
                { type: 'inject', config: { payload: { total: 21 } } },
                {
                    type: 'condition',
                    config: {
                        field: 'payload.total',
                        operator: 'equals',
                        value: { type: 'expression', value: 'flow.threshold + 1' }
                    }
                }
            ]), { flow: { threshold: 20 } });
            expect(condition.data?.executionState?.nodeStates.condition_1.result?.data?.condition).toBe(true);

            const filtered = await service.execute(chain([
                { type: 'inject', config: { payload: { items: [{ v: 1 }, { v: 2 }, { v: 3 }] } } },
                {
                    type: 'filter',
                    config: {
                        field: 'items',
                        path: 'v',
                        operator: 'gt',
                        value: { type: 'expression', value: '1 + 1' }
                    }
                }
            ]), {});
            expect(filtered.data?.executionState?.nodeStates.filter_1.result?.data?.items).toEqual([{ v: 3 }]);
        });

        it('resolves inject property expressions', async () => {
            const result = await service.execute(chain([
                {
                    type: 'inject',
                    config: {
                        payload: { total: 21 },
                        properties: [
                            { key: 'doubled', value: { type: 'expression', value: 'payload.total * 2' } }
                        ]
                    }
                }
            ]), {});
            expect(result.success).toBe(true);
            expect(result.data?.executionState?.nodeStates.inject_0.result?.data?.doubled).toBe(42);
        });

        it('reports broken expressions before running', async () => {
            const designer = new WorkflowDesigner({
                definition: {
                    id: 'expression-validation',
                    name: 'Expression validation',
                    nodes: [
                        registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { total: 1 } } }),
                        registry.createNode('switch', { x: 200, y: 0 }, {
                            id: 'switch_1',
                            config: {
                                field: 'payload.total',
                                rules: [{ operator: 'equals', value: { type: 'expression', value: 'payload.total +' } }]
                            }
                        })
                    ],
                    connections: []
                },
                registry,
                service
            });
            // `run` loads the evaluator before validating.
            const result = await designer.run({});
            expect(result.success).toBe(false);
            expect(String(result.error?.message || '')).toContain('Expression error');
            expect(String(result.error?.message || '')).toMatch(/position|unexpected|token/i);

            // A valid expression passes validation and runs.
            designer.updateNodeConfig('switch_1', {
                rules: [{ operator: 'equals', value: { type: 'expression', value: 'payload.total' } }]
            });
            const ok = await designer.run({});
            expect(ok.success).toBe(true);
        });

        it('fails the node with a readable message for a broken expression', async () => {
            const result = await service.execute(chain([
                { type: 'inject', config: { payload: { total: 1 } } },
                {
                    type: 'switch',
                    config: {
                        field: 'payload.total',
                        rules: [{ operator: 'equals', value: { type: 'expression', value: 'payload.total +' } }]
                    }
                }
            ]), {});
            expect(result.success).toBe(false);
            const state = result.data?.executionState?.nodeStates.switch_1;
            expect(state?.status).toBe('failed');
            expect(state?.error || '').toMatch(/position|syntax|token|unexpected/i);
        });
    });
});
