import expect = require('expect');
import { createInjector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { migrateNodeConfig } from '../src/visual/workflow-config-migrations';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Change rule config migration', () => {
    function config(rules: any[]): Record<string, any> {
        return { rules };
    }

    it('rewrites legacy value sources into typed values', () => {
        const migrated = migrateNodeConfig('change', config([
            { action: 'set', field: 'a', valueFrom: 'msg', valuePath: 'payload.total' },
            { action: 'set', field: 'b', valueFrom: 'flow', valuePath: 'count' },
            { action: 'set', field: 'c', valueFrom: 'global', valuePath: 'region' },
            { action: 'set', field: 'd', valueFrom: 'env', valuePath: 'STAGE' },
            { action: 'set', field: 'e', valueFrom: 'expression', valueExpression: 'payload.total * 2' },
            { action: 'set', field: 'f', valueFrom: 'literal', value: { nested: true } },
            { action: 'set', field: 'g', valueFrom: 'literal', value: 42 },
            { action: 'set', field: 'h', valueFrom: 'literal', value: true },
            { action: 'set', field: 'i', valueFrom: 'literal', value: 'plain' },
            { action: 'set', field: 'j', valueFrom: 'literal', value: '{"json":true}' }
        ]));
        const values = migrated.rules.map((rule: any) => rule.value);
        expect(values[0]).toEqual({ type: 'msg', path: 'payload.total' });
        expect(values[1]).toEqual({ type: 'flow', path: 'count' });
        expect(values[2]).toEqual({ type: 'global', path: 'region' });
        expect(values[3]).toEqual({ type: 'env', path: 'STAGE' });
        expect(values[4]).toEqual({ type: 'expression', value: 'payload.total * 2' });
        expect(values[5]).toEqual({ type: 'literal', valueType: 'json', value: '{"nested":true}' });
        expect(values[6]).toEqual({ type: 'literal', valueType: 'num', value: '42' });
        expect(values[7]).toEqual({ type: 'literal', valueType: 'bool', value: 'true' });
        expect(values[8]).toBe('plain');
        expect(values[9]).toEqual({ type: 'literal', valueType: 'json', value: '{"json":true}' });
        // Legacy keys are gone so the inspector renders one field.
        expect(migrated.rules.every((rule: any) => !('valueFrom' in rule) && !('valuePath' in rule))).toBe(true);
    });

    it('leaves typed rules, unknown sources and other nodes alone', () => {
        const typed = config([{ action: 'set', field: 'a', value: { type: 'msg', path: 'payload.x' } }]);
        expect(migrateNodeConfig('change', typed)).toBe(typed);
        const unknown = config([{ action: 'set', field: 'a', valueFrom: 'custom', valuePath: 'x' }]);
        expect(migrateNodeConfig('change', unknown).rules[0]).toBe(unknown.rules[0]);
        const task = { values: { a: 1 } };
        expect(migrateNodeConfig('task', task)).toBe(task);
    });

    it('runs migrated rules exactly like the legacy shape', async () => {
        const injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        const registry = injector.get(WorkflowNodeRegistry);
        const service = injector.get(VisualWorkflowService);
        const legacyRule = {
            action: 'set',
            field: 'variables.total',
            valueFrom: 'expression',
            valueExpression: 'payload.total * 2'
        };
        const typedRule = migrateNodeConfig('change', config([legacyRule])).rules[0];
        const build = (rule: any): VisualWorkflowDefinition => ({
            id: 'change-migration',
            name: 'Change migration',
            nodes: [
                registry.createNode('inject', { x: 0, y: 0 }, { id: 'inject_1', config: { payload: { total: 21 } } }),
                registry.createNode('change', { x: 200, y: 0 }, { id: 'change_1', config: { rules: [rule] } })
            ],
            connections: [{
                id: 'c1', sourceNodeId: 'inject_1', sourcePort: 'out',
                targetNodeId: 'change_1', targetPort: 'in'
            }]
        });
        const legacy = await service.execute(build(legacyRule), {});
        const typed = await service.execute(build(typedRule), {});
        const valueOf = (result: any) =>
            result.data?.executionState?.nodeStates.change_1.result?.data?.value?.variables;
        expect(valueOf(legacy)).toEqual({ total: 42 });
        expect(valueOf(typed)).toEqual(valueOf(legacy));
    });

    it('upgrades change rules when the designer opens a document', () => {
        const registry = new WorkflowNodeRegistry();
        const designer = new WorkflowDesigner({
            registry,
            definition: {
                id: 'legacy-change',
                name: 'Legacy change',
                nodes: [
                    registry.createNode('change', { x: 0, y: 0 }, {
                        id: 'change_1',
                        config: {
                            rules: [{
                                action: 'set',
                                field: 'variables.name',
                                valueFrom: 'msg',
                                valuePath: 'payload.name'
                            }]
                        }
                    })
                ],
                connections: []
            }
        });
        expect(designer.nodes[0].config?.rules?.[0]?.value)
            .toEqual({ type: 'msg', path: 'payload.name' });
        expect(designer.nodes[0].config?.rules?.[0]?.valueFrom).toBeUndefined();
    });
});
