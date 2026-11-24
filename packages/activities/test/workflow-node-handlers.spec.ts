import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import {
    getWorkflowNodeHandler,
    listWorkflowNodeHandlerTypes,
    registerWorkflowNodeHandler
} from '../src/visual/runtime/workflow-node-handlers';
import { VisualWorkflowDefinition } from '../src/visual/types';

describe('Workflow node handler registry', () => {
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
            id: 'handler-chain',
            name: 'Handler chain',
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

    it('registers the control family by node type', () => {
        const types = listWorkflowNodeHandlerTypes();
        expect(types).toContain('start');
        expect(types).toContain('end');
        expect(types).toContain('junction');
        expect(types).toContain('sequence');
        expect(types).toContain('comment');
        expect(types).toContain('parallel');
        expect(types).toContain('trycatch');
        expect(getWorkflowNodeHandler('start')).toBeTruthy();
        expect(getWorkflowNodeHandler('http-request')).toBeUndefined();
    });

    it('executes registered handlers instead of the inline switch', async () => {
        const result = await service.execute(chain([{ type: 'start' }]), {});
        const state = result.data?.executionState?.nodeStates.start_0;
        expect(result.success).toBe(true);
        expect(state?.result?.data?.started).toBe(true);
    });

    it('lets hosts register or replace a node handler', async () => {
        registry.register({
            type: 'handler-test',
            label: 'Handler test',
            category: 'advanced',
            icon: '◆',
            color: '#64748b',
            inputs: [],
            outputs: []
        } as any);
        registerWorkflowNodeHandler('handler-test', ({ node }) => ({
            success: true,
            data: { nodeId: node.id, handler: 'first' }
        }));
        const first = await service.execute(chain([{ type: 'handler-test' }]), {});
        expect(first.data?.executionState?.nodeStates['handler-test_0'].result?.data?.handler)
            .toBe('first');

        registerWorkflowNodeHandler('handler-test', ({ node }) => ({
            success: true,
            data: { nodeId: node.id, handler: 'second' }
        }));
        const second = await service.execute(chain([{ type: 'handler-test' }]), {});
        expect(second.data?.executionState?.nodeStates['handler-test_0'].result?.data?.handler)
            .toBe('second');
    });
});
