import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { VisualWorkflowDefinition } from '../src/visual/types';

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

    it('supports workflows whose entry is an inject trigger', () => {
        const definition = chain([
            { type: 'inject', config: { payload: {} } },
            { type: 'comment', config: { text: 'note' } }
        ]);
        expect(service.validate(definition).valid).toBe(true);
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
