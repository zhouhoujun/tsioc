import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import {
    coerceWorkflowLiteral,
    decodeWorkflowTypedValue,
    encodeWorkflowTypedValue,
    isWorkflowTypedReference,
    isWorkflowValueRef,
    resolveWorkflowTypedValue,
    WORKFLOW_TYPED_CODEC
} from '../src/visual/workflow-typed-value';
import { resolveWorkflowValue } from '../src/visual/workflow-runtime';
import { validateWorkflowConfigs } from '../src/visual/workflow-config-validation';
import { VisualWorkflowDefinition } from '../src/visual/types';
import { WorkflowTypedValueWidgetComponent } from '../src/visual/components/workflow-typed-value-widget';

describe('Workflow typed values', () => {
    const context: any = {
        msg: { payload: { user: { name: 'Ada' }, total: 5 }, topic: 'users' },
        flow: { count: 2 },
        global: { environment: 'prod' },
        env: { TOKEN: 'secret' }
    };

    describe('storage codec', () => {
        it('keeps literal text plain and encodes every other source explicitly', () => {
            expect(decodeWorkflowTypedValue('hello')).toEqual({ source: 'literal', text: 'hello' });
            expect(encodeWorkflowTypedValue('literal', 'hello')).toBe('hello');

            expect(decodeWorkflowTypedValue('msg.payload')).toEqual({ source: 'msg', text: 'payload' });
            expect(encodeWorkflowTypedValue('msg', 'payload')).toEqual({ type: 'msg', path: 'payload' });

            expect(encodeWorkflowTypedValue('flow', 'count')).toEqual({ type: 'flow', path: 'count' });
            expect(encodeWorkflowTypedValue('num', '42')).toEqual({ type: 'literal', valueType: 'num', value: '42' });
            expect(encodeWorkflowTypedValue('json', '{"a":1}')).toEqual({
                type: 'literal',
                valueType: 'json',
                value: '{"a":1}'
            });
        });

        it('decodes stored references and literal classes', () => {
            expect(decodeWorkflowTypedValue({ type: 'msg', path: 'payload.total' })).toEqual({
                source: 'msg',
                text: 'payload.total'
            });
            expect(decodeWorkflowTypedValue({ type: 'literal', valueType: 'num', value: 42 })).toEqual({
                source: 'num',
                text: '42'
            });
            // `str` folds into the plain literal source so older documents keep
            // the exact selector they had.
            expect(decodeWorkflowTypedValue({ type: 'literal', valueType: 'str', value: 'x' })).toEqual({
                source: 'literal',
                text: 'x'
            });
            expect(decodeWorkflowTypedValue(undefined)).toEqual({ source: 'literal', text: '' });
        });

        it('round-trips through the dynamic-form codec', () => {
            const stored = [encodeWorkflowTypedValue('msg', 'payload'), { type: 'literal', valueType: 'bool', value: 'true' }];
            expect(WORKFLOW_TYPED_CODEC.decode(stored[0])).toEqual({ source: 'msg', text: 'payload' });
            expect(WORKFLOW_TYPED_CODEC.decode(stored[1])).toEqual({ source: 'bool', text: 'true' });
            expect(WORKFLOW_TYPED_CODEC.encode('msg', 'topic')).toEqual({ type: 'msg', path: 'topic' });
            expect(WORKFLOW_TYPED_CODEC.isReference!(stored[0])).toBe(true);
            expect(WORKFLOW_TYPED_CODEC.isReference!('msg.payload')).toBe(true);
            expect(WORKFLOW_TYPED_CODEC.isReference!('hello')).toBe(false);
            expect(WORKFLOW_TYPED_CODEC.validate!({ type: 'literal', valueType: 'json', value: '{oops' }))
                .toContain('Invalid JSON');
            expect(WORKFLOW_TYPED_CODEC.validate!({ type: 'literal', valueType: 're', value: '(' }))
                .toContain('Invalid regular expression');
            expect(WORKFLOW_TYPED_CODEC.validate!({ type: 'msg', path: 'payload.total' })).toBeUndefined();
        });
    });

    describe('reference detection', () => {
        it('separates references from literals', () => {
            expect(isWorkflowValueRef({ type: 'msg', path: 'a' })).toBe(true);
            expect(isWorkflowValueRef({ type: 'literal', value: 'a' })).toBe(true);
            expect(isWorkflowValueRef({ some: 'object' })).toBe(false);
            expect(isWorkflowValueRef('msg.a')).toBe(false);

            expect(isWorkflowTypedReference({ type: 'msg', path: 'a' })).toBe(true);
            expect(isWorkflowTypedReference({ type: 'literal', value: 'a' })).toBe(false);
            expect(isWorkflowTypedReference('flow.count')).toBe(true);
            expect(isWorkflowTypedReference('plain')).toBe(false);
        });
    });

    describe('resolution', () => {
        it('coerces literal classes', () => {
            expect(coerceWorkflowLiteral('num', '42')).toBe(42);
            expect(coerceWorkflowLiteral('bool', 'true')).toBe(true);
            expect(coerceWorkflowLiteral('bool', 'false')).toBe(false);
            expect(coerceWorkflowLiteral('json', '{"a":1}')).toEqual({ a: 1 });
            expect(coerceWorkflowLiteral(undefined, '42')).toBe('42');
            expect(coerceWorkflowLiteral('re', '^a+$')).toBeInstanceOf(RegExp);
            expect(() => coerceWorkflowLiteral('json', '{oops')).toThrow(/Invalid JSON literal/);
        });

        it('resolves msg/flow/global/env objects and keeps plain strings literal', () => {
            expect(resolveWorkflowTypedValue({ type: 'msg', path: 'payload.user.name' }, context)).toBe('Ada');
            expect(resolveWorkflowTypedValue({ type: 'flow', path: 'count' }, context)).toBe(2);
            expect(resolveWorkflowTypedValue({ type: 'global', path: 'environment' }, context)).toBe('prod');
            expect(resolveWorkflowTypedValue({ type: 'env', path: 'TOKEN' }, context)).toBe('secret');
            // Legacy prefix form from older documents.
            expect(resolveWorkflowTypedValue('msg.topic', context)).toBe('users');
            // A plain string is a literal, never a context path.
            expect(resolveWorkflowTypedValue('msg-topic', context)).toBe('msg-topic');
            expect(resolveWorkflowTypedValue('plain', context)).toBe('plain');
            expect(resolveWorkflowTypedValue({ type: 'msg', path: 'payload.missing' }, context)).toBeUndefined();
        });

        it('keeps the legacy path heuristic for path fields', () => {
            expect(resolveWorkflowValue('flow.count', context)).toBe(2);
            expect(resolveWorkflowValue('42', context)).toBe(42);
            expect(resolveWorkflowValue({ type: 'literal', valueType: 'str', value: '42' }, context)).toBe('42');
        });
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
                id: 'typed-value-chain',
                name: 'Typed value chain',
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

        it('compares switch rules against typed literal classes', async () => {
            const result = await service.execute(chain([
                { type: 'inject', config: { payload: { total: 5 } } },
                {
                    type: 'switch',
                    config: {
                        field: 'msg.payload.total',
                        rules: [
                            { operator: 'equals', value: { type: 'literal', valueType: 'num', value: '5' } },
                            { operator: 'equals', value: '5' }
                        ]
                    }
                }
            ]), {});
            expect(result.success).toBe(true);
            expect(result.data?.executionState?.nodeStates.switch_1.result?.data?.route).toBe(1);
        });

        it('compares against a typed msg reference', async () => {
            const result = await service.execute(chain([
                {
                    type: 'inject',
                    config: {
                        payload: { approved: true, expected: true },
                        properties: [{ key: 'expected', value: { type: 'msg', path: 'payload.approved' } }]
                    }
                },
                {
                    type: 'condition',
                    config: {
                        field: 'msg.payload.approved',
                        operator: 'equals',
                        value: { type: 'msg', path: 'payload.expected' }
                    }
                }
            ]), {});
            expect(result.success).toBe(true);
            expect(result.data?.executionState?.nodeStates.condition_1.result?.data?.condition).toBe(true);
        });

        it('applies typed json literals to inject properties', async () => {
            const result = await service.execute(chain([
                {
                    type: 'inject',
                    config: {
                        payload: {},
                        properties: [{ key: 'meta', value: { type: 'literal', valueType: 'json', value: '{"source":"typed"}' } }]
                    }
                }
            ]), {});
            expect(result.success).toBe(true);
            expect(result.data?.executionState?.nodeStates.inject_0.result?.data?.meta).toEqual({ source: 'typed' });
        });
    });

    describe('validation', () => {
        let injector: Injector;
        let registry: WorkflowNodeRegistry;

        beforeEach(() => {
            injector = createInjector();
            InjectUtil.use(injector, WorkflowModule);
            registry = injector.get(WorkflowNodeRegistry);
        });

        function definitionWithRules(rules: any[]): VisualWorkflowDefinition {
            return {
                id: 'typed-validation',
                name: 'Typed validation',
                nodes: [
                    registry.createNode('switch', { x: 0, y: 0 }, {
                        id: 'switch_1',
                        config: { field: 'msg.payload', rules }
                    })
                ],
                connections: []
            };
        }

        it('flags typed literals that cannot be parsed', () => {
            const issues = validateWorkflowConfigs(definitionWithRules([
                { operator: 'equals', value: { type: 'literal', valueType: 'json', value: '{oops' } },
                { operator: 'equals', value: { type: 'literal', valueType: 'num', value: 'abc' } },
                { operator: 'equals', value: { type: 'literal', valueType: 're', value: '(' } }
            ]), registry);
            expect(issues.some(item => item.fieldKey === 'rules[0].value' && /Invalid JSON literal/.test(item.message))).toBe(true);
            expect(issues.some(item => item.fieldKey === 'rules[1].value' && /Not a number/.test(item.message))).toBe(true);
            expect(issues.some(item => item.fieldKey === 'rules[2].value' && /Invalid regular expression/.test(item.message))).toBe(true);
        });

        it('completes typed paths and commits the selected path', async () => {
            const widget = new WorkflowTypedValueWidgetComponent();
            const changes: any[] = [];
            widget.field = {
                key: 'value',
                type: 'text',
                typedSources: [
                    { value: 'literal', label: 'Literal' },
                    {
                        value: 'msg',
                        label: 'msg',
                        completion: 'msg',
                        completionSource: (query: string) => [
                            { label: 'payload.total', value: 'payload.total' },
                            { label: 'payload.name', value: 'payload.name' }
                        ].filter(item => !query || item.value.startsWith(query))
                    }
                ]
            } as any;
            widget.source = 'msg';
            widget.changeAction = value => changes.push(value);

            widget.inputText({ target: { value: 'payload.' } });
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(widget.completionOpen).toBe(true);
            expect(widget.suggestions.map(item => item.value)).toEqual(['payload.total', 'payload.name']);

            // Arrow keys move the active suggestion; Enter commits it as a
            // typed reference and closes the panel.
            widget.completionKeydown({ key: 'ArrowDown', preventDefault() { /* noop */ } });
            widget.completionKeydown({ key: 'Enter', preventDefault() { /* noop */ } });
            expect(widget.completionOpen).toBe(false);
            expect(changes[changes.length - 1]).toEqual({ type: 'msg', path: 'payload.name' });

            // Escape/blur close without changing the typed value.
            widget.inputText({ target: { value: 'pay' } });
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(widget.completionOpen).toBe(true);
            widget.completionKeydown({ key: 'Escape', preventDefault() { /* noop */ } });
            expect(widget.completionOpen).toBe(false);

            // Literal sources have no completion hook.
            widget.source = 'literal';
            widget.text = 'plain';
            widget.requestCompletion();
            expect(widget.completionOpen).toBe(false);
        });

        it('accepts references and readable literals', () => {
            const issues = validateWorkflowConfigs(definitionWithRules([
                { operator: 'equals', value: { type: 'msg', path: 'payload.total' } },
                { operator: 'equals', value: { type: 'literal', valueType: 'num', value: '5' } },
                { operator: 'equals', value: { type: 'literal', valueType: 'json', value: '{"a":1}' } },
                { operator: 'equals', value: 'msg.total' }
            ]), registry);
            expect(issues).toEqual([]);
        });
    });
});
