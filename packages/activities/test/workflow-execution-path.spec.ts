import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowExecutionEvent } from '../src/visual/types';
import { VisualNodeActivityAdapter } from '../src/visual/VisualNodeActivityAdapter';

describe('Visual Workflow Execution Path', () => {
    let injector: Injector;
    let registry: WorkflowNodeRegistry;
    let service: VisualWorkflowService;
    let designer: WorkflowDesigner;

    beforeEach(() => {
        injector = createInjector();
        InjectUtil.use(injector, WorkflowModule);
        registry = injector.get(WorkflowNodeRegistry);
        service = injector.get(VisualWorkflowService);
        designer = new WorkflowDesigner({ registry, service });
    });

    it('streams node and edge states for the executed branch', async () => {
        const events: WorkflowExecutionEvent[] = [];
        const result = await service.execute(designer.definition, { approved: true }, {
            onEvent: event => events.push(event)
        });

        expect(result.success).toBe(true);
        const snapshot = result.data?.executionState;
        expect(snapshot.status).toBe('completed');
        expect(snapshot.nodeStates.start_1.status).toBe('success');
        expect(snapshot.nodeStates.task_1.status).toBe('success');
        expect(snapshot.nodeStates.condition_1.status).toBe('success');
        expect(snapshot.nodeStates.task_2.status).toBe('success');
        expect(snapshot.nodeStates.task_3.status).toBe('skipped');
        expect(snapshot.nodeStates.end_1.status).toBe('success');

        expect(snapshot.edgeStates.conn_1.status).toBe('traversed');
        expect(snapshot.edgeStates.conn_3.status).toBe('traversed');
        expect(snapshot.edgeStates.conn_5.status).toBe('traversed');
        expect(snapshot.edgeStates.conn_4.status).toBe('skipped');

        expect(events.some(event => event.type === 'workflow-start')).toBe(true);
        expect(events.some(event => event.type === 'node-start' && event.nodeId === 'task_1')).toBe(true);
        expect(events.some(event => event.type === 'node-end' && event.nodeId === 'task_1' && event.status === 'success')).toBe(true);
        expect(events.some(event => event.type === 'edge-traversed' && event.connectionId === 'conn_3')).toBe(true);
        expect(events.some(event => event.type === 'edge-skipped' && event.connectionId === 'conn_4')).toBe(true);
        expect(events.some(event => event.type === 'workflow-end')).toBe(true);
    });

    it('takes the false branch when the condition is not met', async () => {
        designer.updateNodeConfig('task_1', { result: { approved: false } });
        const result = await service.execute(designer.definition, { approved: false });
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.nodeStates.task_3.status).toBe('success');
        expect(snapshot.nodeStates.task_2.status).toBe('skipped');
        expect(snapshot.edgeStates.conn_4.status).toBe('traversed');
        expect(snapshot.edgeStates.conn_3.status).toBe('skipped');
    });

    it('marks the failing node and stops the path', async () => {
        designer.updateNodeConfig('task_1', { fail: true });
        const events: WorkflowExecutionEvent[] = [];
        const result = await service.execute(designer.definition, { approved: true }, {
            onEvent: event => events.push(event)
        });
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(false);
        expect(snapshot.status).toBe('failed');
        expect(snapshot.nodeStates.task_1.status).toBe('failed');
        expect(snapshot.nodeStates.condition_1.status).toBe('skipped');
        expect(snapshot.error).toContain('failed');
        expect(events.some(event => event.type === 'workflow-error')).toBe(true);
    });

    it('routes failures through the error port and recovers', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_e' }),
            registry.createNode('task', { x: 200, y: 0 }, { id: 'task_e', name: 'Risky', config: { fail: true, error: 'boom' } }),
            registry.createNode('log', { x: 400, y: 80 }, { id: 'log_e', config: { message: 'errorMessage' } }),
            registry.createNode('end', { x: 600, y: 80 }, { id: 'end_e' })
        ];
        const edge = (id: string, source: string, sourcePort: string, target: string) => ({
            id, sourceNodeId: source, sourcePort, targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'error-branch',
            name: 'Error branch',
            nodes,
            connections: [
                edge('e1', 'start_e', 'out', 'task_e'),
                edge('e2', 'task_e', 'error', 'log_e'),
                edge('e3', 'log_e', 'out', 'end_e')
            ]
        };
        const result = await service.execute(definition, {});
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.status).toBe('completed');
        expect(snapshot.nodeStates.task_e.status).toBe('failed');
        expect(snapshot.nodeStates.log_e.status).toBe('success');
        expect(snapshot.nodeStates.end_e.status).toBe('success');
        expect(snapshot.edgeStates.e2.status).toBe('traversed');
        expect(result.data?.nodeResults.log_e.data.message).toBe('boom');
    });

    it('keeps finished executions for post-run inspection', async () => {
        const result = await service.execute(designer.definition, { approved: true });
        const executionId = result.data?.executionId as string;
        const state = service.getExecution(executionId);
        expect(state).toBeDefined();
        expect(state?.status).toBe('completed');
        const snapshot = service.getExecutionSnapshot(executionId);
        expect(snapshot?.nodeStates.task_1.status).toBe('success');
    });

    it('cancels a running workflow and reports cancelled nodes', async () => {
        const definition = {
            id: 'cancel-test',
            name: 'Cancel test',
            nodes: [
                registry.createNode('start', { x: 0, y: 0 }, { id: 'start_c' }),
                registry.createNode('delay', { x: 200, y: 0 }, { id: 'delay_c', config: { delay: 50 } })
            ],
            connections: [{
                id: 'conn_c',
                sourceNodeId: 'start_c',
                sourcePort: 'out',
                targetNodeId: 'delay_c',
                targetPort: 'in'
            }]
        };
        const result = await service.execute(definition, {}, {
            onEvent: event => {
                if (event.type === 'node-start' && event.nodeId === 'delay_c') {
                    void service.cancelExecution(event.executionId);
                }
            }
        });
        expect(result.success).toBe(false);
        expect(result.data?.status).toBe('cancelled');
        expect(result.data?.executionState.status).toBe('cancelled');
    });

    it('exposes execution state to the designer while running', async () => {
        const result = await designer.run({ context: { approved: true } });
        expect(result.success).toBe(true);
        expect(designer.execution).toBeDefined();
        expect(designer.execution?.nodeStates.task_1.status).toBe('success');
        expect(designer.running).toBe(false);
        expect(designer.message).toBe('workflow.message.completed');
    });

    it('resumes the designer from an automatic checkpoint', async () => {
        const first = await designer.run({
            context: { approved: true },
            onCheckpoint: snapshot => {
                if (snapshot.nodeStates.task_1?.status === 'success'
                    && snapshot.nodeStates.condition_1?.status === 'pending') {
                    void designer.cancel();
                }
            }
        });
        expect(first.success).toBe(false);
        expect(designer.checkpoint).toBeDefined();
        expect(designer.canResume).toBe(true);

        const resumed = await designer.resume({ context: { approved: true } });
        expect(resumed.success).toBe(true);
        expect(resumed.data?.executionState.nodeStates.task_1.status).toBe('success');
        expect(resumed.data?.executionState.nodeStates.task_2.status).toBe('success');
        expect(designer.canResume).toBe(false);
    });

    it('retains run history and replays a selected execution', async () => {
        const first = await designer.run({ context: { approved: true } });
        const firstId = first.data?.executionId as string;
        designer.updateNodeConfig('task_1', { result: { approved: false } });
        const second = await designer.run({ context: { approved: false } });
        const secondId = second.data?.executionId as string;

        expect(designer.executionHistory.length).toBe(2);
        expect(designer.executionHistory[0].executionId).toBe(secondId);
        expect(designer.selectExecution(firstId)).toBe(true);
        expect(designer.execution?.executionId).toBe(firstId);
        expect(designer.execution?.nodeStates.task_2.status).toBe('success');
        expect(designer.selectedExecutionId).toBe(firstId);
        expect(designer.selectExecution(secondId)).toBe(true);
        expect(designer.execution?.nodeStates.task_3.status).toBe('success');

        designer.clearExecutionHistory();
        expect(designer.executionHistory.length).toBe(0);
        expect(designer.execution).toBeUndefined();
    });

    it('waits for all parallel branches at a join node', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_p' }),
            registry.createNode('parallel', { x: 200, y: 0 }, { id: 'parallel_p' }),
            registry.createNode('delay', { x: 400, y: -80 }, { id: 'delay_a', name: 'A', config: { delay: 40 } }),
            registry.createNode('delay', { x: 400, y: 80 }, { id: 'delay_b', name: 'B', config: { delay: 10 } }),
            registry.createNode('join', { x: 600, y: 0 }, { id: 'join_p' }),
            registry.createNode('end', { x: 800, y: 0 }, { id: 'end_p' })
        ];
        const edge = (id: string, source: string, sourcePort: string, target: string) => ({
            id, sourceNodeId: source, sourcePort, targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'join-test',
            name: 'Join test',
            nodes,
            connections: [
                edge('e1', 'start_p', 'out', 'parallel_p'),
                edge('e2', 'parallel_p', 'out', 'delay_a'),
                edge('e3', 'parallel_p', 'out', 'delay_b'),
                edge('e4', 'delay_a', 'out', 'join_p'),
                edge('e5', 'delay_b', 'out', 'join_p'),
                edge('e6', 'join_p', 'out', 'end_p')
            ]
        };
        const result = await service.execute(definition, {});
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.nodeStates.delay_a.status).toBe('success');
        expect(snapshot.nodeStates.delay_b.status).toBe('success');
        expect(snapshot.nodeStates.join_p.status).toBe('success');
        expect(snapshot.nodeStates.end_p.status).toBe('success');
        expect(snapshot.nodeStates.join_p.startedAt).toBeGreaterThanOrEqual(
            Math.max(snapshot.nodeStates.delay_a.finishedAt!, snapshot.nodeStates.delay_b.finishedAt!)
        );
        expect(snapshot.edgeStates.e4.count).toBe(1);
        expect(snapshot.edgeStates.e5.count).toBe(1);
    });

    it('resumes from a saved checkpoint without re-running completed nodes', async () => {
        let stepBCalls = 0;
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_r' }),
            registry.createNode('task', { x: 200, y: 0 }, { id: 'task_a', name: 'A', config: { result: { value: 1 } } }),
            registry.createNode('task', { x: 400, y: 0 }, { id: 'task_b', name: 'B', config: { action: 'stepB' } }),
            registry.createNode('end', { x: 600, y: 0 }, { id: 'end_r' })
        ];
        const edge = (id: string, source: string, target: string) => ({
            id, sourceNodeId: source, sourcePort: 'out', targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'resume-test',
            name: 'Resume test',
            nodes,
            connections: [edge('r1', 'start_r', 'task_a'), edge('r2', 'task_a', 'task_b'), edge('r3', 'task_b', 'end_r')]
        };
        let checkpoint: any;
        const first = await service.execute(definition, {}, {
            onCheckpoint: snapshot => {
                if (!checkpoint
                    && snapshot.nodeStates.task_a?.status === 'success'
                    && snapshot.nodeStates.task_b?.status === 'pending') {
                    checkpoint = JSON.parse(JSON.stringify(snapshot));
                    void service.cancelExecution(snapshot.executionId);
                }
            }
        });
        expect(first.success).toBe(false);
        expect(checkpoint).toBeDefined();
        expect(checkpoint.nodeStates.task_b.status).toBe('pending');

        const resumed = await service.execute(definition, {
            actions: {
                stepB: () => {
                    stepBCalls += 1;
                    return { done: true };
                }
            }
        }, { resumeFrom: checkpoint });
        expect(resumed.success).toBe(true);
        expect(stepBCalls).toBe(1);
        expect(resumed.data?.executionState.nodeStates.task_a.status).toBe('success');
        expect(resumed.data?.executionState.nodeStates.task_b.status).toBe('success');
        expect(resumed.data?.executionState.nodeStates.end_r.status).toBe('success');
    });

    it('runs generated node code through core interceptors', async () => {
        const seen: string[] = [];
        service.use({
            intercept: (input, next, context) => {
                seen.push(input.node.id);
                return next.handle(input, context);
            }
        });
        const result = await service.execute(designer.definition, { approved: true });
        expect(result.success).toBe(true);
        expect(seen).toContain('start_1');
        expect(seen).toContain('task_1');
        expect(seen).toContain('condition_1');
        expect(seen).toContain('task_2');
        expect(result.data?.executionState.nodeStates.task_1.status).toBe('success');
    });

    it('lets a core interceptor short-circuit generated node execution', async () => {
        service.use({
            intercept: (input, next, context) => {
                if (input.node.id === 'task_1') {
                    return Promise.resolve({
                        success: true,
                        data: { approved: false }
                    });
                }
                return next.handle(input, context);
            }
        });
        const result = await service.execute(designer.definition, { approved: true });
        expect(result.success).toBe(true);
        expect(result.data?.executionState.nodeStates.task_1.status).toBe('success');
        expect(result.data?.executionState.nodeStates.task_3.status).toBe('success');
        expect(result.data?.executionState.nodeStates.task_2.status).toBe('skipped');
    });
});
