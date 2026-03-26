import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { WorkflowModule } from '../src/workflow.module';
import { VisualWorkflowService, VisualWorkflowBuilder } from '../src/visual';
import { VisualWorkflowDefinition, IVisualWorkflowNode } from '../src/visual/types';

describe('Visual Workflow Engine', () => {
    let injector: Injector;
    let workflowService: VisualWorkflowService;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        workflowService = injector.get(VisualWorkflowService);
    });

    describe('VisualWorkflowBuilder', () => {
        it('should create a simple workflow with builder', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('test-workflow-1')
                .setName('Test Workflow')
                .setDescription('A simple test workflow')
                .startNode('Start')
                .taskNode('Process Data', { action: 'process' })
                .endNode('End')
                .connect('start_0', 'task_0')
                .connect('task_0', 'end_0')
                .build();

            expect(workflow.id).toBe('test-workflow-1');
            expect(workflow.name).toBe('Test Workflow');
            expect(workflow.nodes.length).toBe(3);
            expect(workflow.connections.length).toBe(2);
        });

        it('should create a workflow with condition node', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('condition-workflow')
                .setName('Condition Workflow')
                .startNode()
                .conditionNode('Check Value', { field: 'value' })
                .taskNode('Process True', { branch: 'true' })
                .taskNode('Process False', { branch: 'false' })
                .endNode()
                .connect('start_0', 'condition_0')
                .connect('condition_0', 'task_0', { sourcePort: 'true' })
                .connect('condition_0', 'task_1', { sourcePort: 'false' })
                .connect('task_0', 'end_0')
                .connect('task_1', 'end_0')
                .build();

            expect(workflow.nodes.length).toBe(5);
            expect(workflow.connections.length).toBe(5);
            
            const conditionNode = workflow.nodes.find(n => n.type === 'condition');
            expect(conditionNode).toBeDefined();
            expect(conditionNode?.outputs?.length).toBe(2);
        });

        it('should create a workflow with parallel node', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('parallel-workflow')
                .setName('Parallel Workflow')
                .startNode()
                .parallelNode('Run Parallel', { maxConcurrent: 3 })
                .endNode()
                .connect('start_0', 'parallel_0')
                .connect('parallel_0', 'end_0')
                .build();

            expect(workflow.nodes.length).toBe(3);
            const parallelNode = workflow.nodes.find(n => n.type === 'parallel');
            expect(parallelNode).toBeDefined();
            expect(parallelNode?.config?.maxConcurrent).toBe(3);
        });

        it('should create a workflow with delay node', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('delay-workflow')
                .setName('Delay Workflow')
                .startNode()
                .delayNode('Wait', 2000)
                .endNode()
                .connect('start_0', 'delay_0')
                .connect('delay_0', 'end_0')
                .build();

            const delayNode = workflow.nodes.find(n => n.type === 'delay');
            expect(delayNode).toBeDefined();
            expect(delayNode?.config?.delay).toBe(2000);
        });

        it('should create custom node', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('custom-workflow')
                .setName('Custom Workflow')
                .startNode()
                .customNode({
                    id: 'custom_1',
                    name: 'Custom Task',
                    type: 'custom',
                    position: { x: 200, y: 100 },
                    config: { customField: 'value' }
                })
                .endNode()
                .connect('start_0', 'custom_1')
                .connect('custom_1', 'end_0')
                .build();

            const customNode = workflow.nodes.find(n => n.id === 'custom_1');
            expect(customNode).toBeDefined();
            expect(customNode?.type).toBe('custom');
            expect(customNode?.config?.customField).toBe('value');
        });
    });

    describe('VisualWorkflowService - Validation', () => {
        it('should validate a correct workflow', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('valid-workflow')
                .setName('Valid Workflow')
                .startNode()
                .taskNode('Task')
                .endNode()
                .connect('start_0', 'task_1')
                .connect('task_1', 'end_2')
                .build();

            const result = workflowService.validate(workflow);
            if (!result.valid) {
                console.log('Validation errors:', result.errors);
            }
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should detect missing workflow id', () => {
            const workflow: VisualWorkflowDefinition = {
                id: '',
                name: 'Test',
                nodes: [],
                connections: []
            };

            const result = workflowService.validate(workflow);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Workflow ID is required');
        });

        it('should detect missing workflow name', () => {
            const workflow: VisualWorkflowDefinition = {
                id: 'test',
                name: '',
                nodes: [],
                connections: []
            };

            const result = workflowService.validate(workflow);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Workflow name is required');
        });

        it('should detect empty nodes', () => {
            const workflow: VisualWorkflowDefinition = {
                id: 'test',
                name: 'Test',
                nodes: [],
                connections: []
            };

            const result = workflowService.validate(workflow);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Workflow must have at least one node');
        });

        it('should detect missing start node', () => {
            const workflow: VisualWorkflowDefinition = {
                id: 'test',
                name: 'Test',
                nodes: [{
                    id: 'task_1',
                    name: 'Task',
                    type: 'task',
                    position: { x: 0, y: 0 }
                }],
                connections: []
            };

            const result = workflowService.validate(workflow);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('start node'))).toBe(true);
        });

        it('should detect duplicate node ids', () => {
            const workflow: VisualWorkflowDefinition = {
                id: 'test',
                name: 'Test',
                nodes: [
                    { id: 'duplicate', name: 'Node 1', type: 'task', position: { x: 0, y: 0 } },
                    { id: 'duplicate', name: 'Node 2', type: 'task', position: { x: 100, y: 100 } }
                ],
                connections: []
            };

            const result = workflowService.validate(workflow);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Duplicate node IDs'))).toBe(true);
        });

        it('should detect invalid connections', () => {
            const workflow: VisualWorkflowDefinition = {
                id: 'test',
                name: 'Test',
                nodes: [{
                    id: 'start_1',
                    name: 'Start',
                    type: 'start',
                    position: { x: 0, y: 0 }
                }],
                connections: [{
                    id: 'conn_1',
                    sourceNodeId: 'non_existent',
                    targetNodeId: 'start_1',
                    sourcePort: 'out',
                    targetPort: 'in'
                }]
            };

            const result = workflowService.validate(workflow);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('non-existent source node'))).toBe(true);
        });
    });

    describe('VisualWorkflowService - Serialization', () => {
        it('should serialize workflow to JSON', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('serialize-test')
                .setName('Serialize Test')
                .startNode()
                .endNode()
                .connect('start_0', 'end_0')
                .build();

            const json = workflowService.serialize(workflow);
            expect(typeof json).toBe('string');
            
            const parsed = JSON.parse(json);
            expect(parsed.id).toBe('serialize-test');
            expect(parsed.name).toBe('Serialize Test');
        });

        it('should deserialize JSON to workflow', () => {
            const json = JSON.stringify({
                id: 'deserialize-test',
                name: 'Deserialize Test',
                version: '1.0.0',
                nodes: [{
                    id: 'start_1',
                    name: 'Start',
                    type: 'start',
                    position: { x: 0, y: 0 }
                }],
                connections: []
            });

            const workflow = workflowService.deserialize(json);
            expect(workflow.id).toBe('deserialize-test');
            expect(workflow.name).toBe('Deserialize Test');
            expect(workflow.nodes.length).toBe(1);
        });

        it('should round-trip workflow through serialize/deserialize', () => {
            const original = VisualWorkflowBuilder
                .create()
                .setId('roundtrip')
                .setName('Round Trip Test')
                .setDescription('Testing serialization')
                .startNode()
                .taskNode('Process')
                .endNode()
                .connect('start_0', 'task_0')
                .connect('task_0', 'end_0')
                .build();

            const json = workflowService.serialize(original);
            const restored = workflowService.deserialize(json);

            expect(restored.id).toBe(original.id);
            expect(restored.name).toBe(original.name);
            expect(restored.description).toBe(original.description);
            expect(restored.nodes.length).toBe(original.nodes.length);
            expect(restored.connections.length).toBe(original.connections.length);
        });
    });

    describe('VisualWorkflowService - Execution', () => {
        it('should execute a simple workflow', async () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('exec-simple')
                .setName('Simple Execution')
                .startNode()
                .endNode()
                .connect('start_0', 'end_0')
                .build();

            const result = await workflowService.execute(workflow);
            expect(result.success).toBe(true);
            expect(result.data?.executionId).toBeDefined();
        });

        it('should execute workflow with task nodes', async () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('exec-tasks')
                .setName('Tasks Execution')
                .startNode()
                .taskNode('Task 1', { operation: 'op1' })
                .taskNode('Task 2', { operation: 'op2' })
                .endNode()
                .connect('start_0', 'task_0')
                .connect('task_0', 'task_1')
                .connect('task_1', 'end_0')
                .build();

            const result = await workflowService.execute(workflow);
            expect(result.success).toBe(true);
        });

        it('should execute workflow with delay node', async () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('exec-delay')
                .setName('Delay Execution')
                .startNode()
                .delayNode('Short Delay', 100)
                .endNode()
                .connect('start_0', 'delay_1')
                .connect('delay_1', 'end_2')
                .build();

            const startTime = Date.now();
            const result = await workflowService.execute(workflow);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeGreaterThanOrEqual(90);
        });

        it('should handle workflow without connections', async () => {
            const workflow: VisualWorkflowDefinition = {
                id: 'no-connections',
                name: 'No Connections',
                nodes: [{
                    id: 'start_1',
                    name: 'Start',
                    type: 'start',
                    position: { x: 0, y: 0 }
                }],
                connections: []
            };

            const result = await workflowService.execute(workflow);
            expect(result.success).toBe(true);
        });

        it('should track execution state', async () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('state-track')
                .setName('State Tracking')
                .startNode()
                .endNode()
                .connect('start_0', 'end_0')
                .build();

            const result = await workflowService.execute(workflow, { testData: 'value' });
            expect(result.data?.nodeResults).toBeDefined();
        });
    });

    describe('Node Types', () => {
        it('should have correct styles for each node type', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('styles-test')
                .setName('Styles Test')
                .startNode()
                .endNode()
                .taskNode('Task')
                .conditionNode('Condition')
                .parallelNode('Parallel')
                .delayNode('Delay', 100)
                .build();

            const startNode = workflow.nodes.find(n => n.type === 'start');
            expect(startNode?.style?.backgroundColor).toBe('#4CAF50');

            const endNode = workflow.nodes.find(n => n.type === 'end');
            expect(endNode?.style?.backgroundColor).toBe('#f44336');

            const taskNode = workflow.nodes.find(n => n.type === 'task');
            expect(taskNode?.style?.backgroundColor).toBe('#2196F3');

            const conditionNode = workflow.nodes.find(n => n.type === 'condition');
            expect(conditionNode?.style?.backgroundColor).toBe('#FF9800');

            const parallelNode = workflow.nodes.find(n => n.type === 'parallel');
            expect(parallelNode?.style?.backgroundColor).toBe('#9C27B0');

            const delayNode = workflow.nodes.find(n => n.type === 'delay');
            expect(delayNode?.style?.backgroundColor).toBe('#607D8B');
        });

        it('should have correct ports for each node type', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('ports-test')
                .setName('Ports Test')
                .startNode()
                .endNode()
                .taskNode('Task')
                .conditionNode('Condition')
                .build();

            const startNode = workflow.nodes.find(n => n.type === 'start');
            expect(startNode?.outputs?.length).toBe(1);
            expect(startNode?.inputs?.length).toBe(0);

            const endNode = workflow.nodes.find(n => n.type === 'end');
            expect(endNode?.inputs?.length).toBe(1);
            expect(endNode?.outputs?.length).toBe(0);

            const taskNode = workflow.nodes.find(n => n.type === 'task');
            expect(taskNode?.inputs?.length).toBe(1);
            expect(taskNode?.outputs?.length).toBe(2);

            const conditionNode = workflow.nodes.find(n => n.type === 'condition');
            expect(conditionNode?.inputs?.length).toBe(1);
            expect(conditionNode?.outputs?.length).toBe(2);
        });
    });

    describe('Complex Workflows', () => {
        it('should create a complex approval workflow', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('approval-workflow')
                .setName('Approval Workflow')
                .setDescription('A workflow for approval process')
                .startNode('Submit Request')
                .taskNode('Validate Request', { validator: 'requestValidator' })
                .conditionNode('Check Approval', { field: 'isApproved' })
                .taskNode('Approve', { action: 'approve' })
                .taskNode('Reject', { action: 'reject' })
                .endNode('End')
                .connect('start_0', 'task_1')
                .connect('task_1', 'condition_2')
                .connect('condition_2', 'task_3', { sourcePort: 'true', label: 'Approved' })
                .connect('condition_2', 'task_4', { sourcePort: 'false', label: 'Rejected' })
                .connect('task_3', 'end_5')
                .connect('task_4', 'end_5')
                .build();

            expect(workflow.nodes.length).toBe(6);
            expect(workflow.connections.length).toBe(6);

            const validation = workflowService.validate(workflow);
            expect(validation.valid).toBe(true);
        });

        it('should create a data processing pipeline', () => {
            const workflow = VisualWorkflowBuilder
                .create()
                .setId('data-pipeline')
                .setName('Data Processing Pipeline')
                .startNode('Input')
                .parallelNode('Process Parallel', { maxConcurrent: 5 })
                .taskNode('Aggregate Results')
                .taskNode('Save to Database')
                .endNode('Complete')
                .connect('start_0', 'parallel_1')
                .connect('parallel_1', 'task_2')
                .connect('task_2', 'task_3')
                .connect('task_3', 'end_4')
                .build();

            expect(workflow.nodes.length).toBe(5);
            
            const parallelNode = workflow.nodes.find(n => n.type === 'parallel');
            expect(parallelNode?.config?.maxConcurrent).toBe(5);
        });
    });
});