import expect = require('expect');
import { createInjector, Injector, InjectUtil } from '@tsdi/ioc';
import { WorkflowModule } from '../src/workflow.module';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';
import { WorkflowDesigner } from '../src/visual/workflow-designer';
import { VisualWorkflowService } from '../src/visual/VisualWorkflowService';
import { WorkflowExecutionEvent } from '../src/visual/types';
import { VisualNodeActivityAdapter } from '../src/visual/VisualNodeActivityAdapter';
import { compileVisualWorkflow } from '../src/visual/workflow-compiler';

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

    it('routes link-out messages to matching link-in nodes', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_link' }),
            registry.createNode('link', { x: 200, y: 0 }, { id: 'link_out', config: { mode: 'out', links: 'shared' } }),
            registry.createNode('link', { x: 400, y: 0 }, { id: 'link_in', config: { mode: 'in', links: 'shared' } }),
            registry.createNode('task', { x: 600, y: 0 }, { id: 'link_task', config: { result: { reached: true } } }),
            registry.createNode('end', { x: 800, y: 0 }, { id: 'link_end' }),
            registry.createNode('link', { x: 400, y: 120 }, { id: 'link_in_unmatched', config: { mode: 'in', links: 'other' } }),
            registry.createNode('task', { x: 600, y: 120 }, { id: 'unmatched_task', config: { result: { reached: false } } })
        ];
        const edge = (id: string, source: string, target: string) => ({
            id, sourceNodeId: source, sourcePort: 'out', targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'link-test',
            name: 'Link test',
            nodes,
            connections: [
                edge('l1', 'start_link', 'link_out'),
                edge('l2', 'link_in', 'link_task'),
                edge('l3', 'link_task', 'link_end'),
                edge('l4', 'link_in_unmatched', 'unmatched_task')
            ]
        };

        const plan = compileVisualWorkflow(definition);
        expect(plan.entries.map(item => item.id)).not.toContain('link_in');
        expect(plan.outgoing.get('link_out')?.some(connection => connection.targetNodeId === 'link_in')).toBe(true);
        expect(plan.outgoing.get('link_out')?.some(connection => connection.targetNodeId === 'link_in_unmatched')).toBe(false);

        const result = await service.execute(definition, {});
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.nodeStates.link_out.status).toBe('success');
        expect(snapshot.nodeStates.link_in.status).toBe('success');
        expect(snapshot.nodeStates.link_task.result?.data?.reached).toBe(true);
        expect(snapshot.nodeStates.link_end.status).toBe('success');
        expect(snapshot.nodeStates.unmatched_task.status).toBe('skipped');
    });

    it('skips disabled nodes and their downstream branch', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_dis' }),
            registry.createNode('task', { x: 200, y: 0 }, { id: 'disabled_task', config: { result: { ran: true } } }),
            registry.createNode('end', { x: 400, y: 0 }, { id: 'end_dis' })
        ];
        nodes[1].disabled = true;
        const definition = {
            id: 'disabled-node',
            name: 'Disabled node',
            nodes,
            connections: [
                { id: 'd1', sourceNodeId: 'start_dis', sourcePort: 'out', targetNodeId: 'disabled_task', targetPort: 'in' },
                { id: 'd2', sourceNodeId: 'disabled_task', sourcePort: 'out', targetNodeId: 'end_dis', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.nodeStates.disabled_task.status).toBe('skipped');
        expect(snapshot.nodeStates.disabled_task.result?.data?.disabled).toBe(true);
        expect(snapshot.nodeStates.end_dis.status).toBe('skipped');
        expect(snapshot.edgeStates.d2.status).toBe('skipped');
    });

    it('routes guarded branch failures to the try/catch recovery port', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_g' }),
            registry.createNode('trycatch', { x: 200, y: 0 }, { id: 'guard' }),
            registry.createNode('task', { x: 400, y: -80 }, { id: 'failing', config: { fail: true } }),
            registry.createNode('task', { x: 400, y: 80 }, { id: 'recover', config: { result: { recovered: true } } }),
            registry.createNode('end', { x: 600, y: -80 }, { id: 'end_ok' }),
            registry.createNode('end', { x: 600, y: 80 }, { id: 'end_catch' })
        ];
        const edge = (id: string, source: string, sourcePort: string, target: string) => ({
            id, sourceNodeId: source, sourcePort, targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'trycatch-failure',
            name: 'Try catch failure',
            nodes,
            connections: [
                edge('g1', 'start_g', 'out', 'guard'),
                edge('g2', 'guard', 'out', 'failing'),
                edge('g3', 'failing', 'out', 'end_ok'),
                edge('g4', 'guard', 'error', 'recover'),
                edge('g5', 'recover', 'out', 'end_catch')
            ]
        };
        const result = await service.execute(definition, {});
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.nodeStates.failing.status).toBe('failed');
        expect(snapshot.nodeStates.end_ok.status).toBe('skipped');
        expect(snapshot.nodeStates.recover.status).toBe('success');
        expect(snapshot.nodeStates.end_catch.status).toBe('success');
        expect(snapshot.nodeStates.guard.result?.data?.recovered).toBe(true);
        expect(snapshot.nodeStates.guard.result?.data?.failedNodeId).toBe('failing');
        expect(snapshot.edgeStates.g4.status).toBe('traversed');
        expect(snapshot.edgeStates.g3.status).toBe('skipped');
    });

    it('skips the recovery branch when the guarded branch succeeds', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_gs' }),
            registry.createNode('trycatch', { x: 200, y: 0 }, { id: 'guard_ok' }),
            registry.createNode('task', { x: 400, y: -80 }, { id: 'healthy', config: { result: { ok: true } } }),
            registry.createNode('task', { x: 400, y: 80 }, { id: 'unused', config: { result: { recovered: true } } }),
            registry.createNode('end', { x: 600, y: 0 }, { id: 'end_guard_ok' })
        ];
        const edge = (id: string, source: string, sourcePort: string, target: string) => ({
            id, sourceNodeId: source, sourcePort, targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'trycatch-success',
            name: 'Try catch success',
            nodes,
            connections: [
                edge('h1', 'start_gs', 'out', 'guard_ok'),
                edge('h2', 'guard_ok', 'out', 'healthy'),
                edge('h3', 'healthy', 'out', 'end_guard_ok'),
                edge('h4', 'guard_ok', 'error', 'unused')
            ]
        };
        const result = await service.execute(definition, {});
        const snapshot = result.data?.executionState;
        expect(result.success).toBe(true);
        expect(snapshot.nodeStates.healthy.status).toBe('success');
        expect(snapshot.nodeStates.unused.status).toBe('skipped');
        expect(snapshot.edgeStates.h4.status).toBe('skipped');
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

    it('stops a workflow that exceeds its time budget', async () => {
        const definition = {
            id: 'timeout-test',
            name: 'Timeout test',
            nodes: [
                registry.createNode('start', { x: 0, y: 0 }, { id: 'start_t' }),
                registry.createNode('delay', { x: 200, y: 0 }, { id: 'delay_t', config: { delay: 500 } }),
                registry.createNode('end', { x: 400, y: 0 }, { id: 'end_t' })
            ],
            connections: [
                { id: 't1', sourceNodeId: 'start_t', sourcePort: 'out', targetNodeId: 'delay_t', targetPort: 'in' },
                { id: 't2', sourceNodeId: 'delay_t', sourcePort: 'out', targetNodeId: 'end_t', targetPort: 'in' }
            ]
        };
        const started = Date.now();
        const result = await service.execute(definition, {}, { timeout: 60 });
        const elapsed = Date.now() - started;
        expect(result.success).toBe(false);
        expect(result.data?.status).toBe('cancelled');
        expect(result.data?.executionState.status).toBe('cancelled');
        expect(String(result.error?.message || '')).toContain('timed out');
        expect(result.data?.executionState.nodeStates.delay_t.status).toBe('cancelled');
        expect(result.data?.executionState.nodeStates.end_t.status).toBe('skipped');
        expect(elapsed).toBeLessThan(400);
    });

    it('shares the remaining time budget with sub-workflows', async () => {
        const child = {
            id: 'slow-child',
            name: 'Slow child',
            nodes: [
                registry.createNode('delay', { x: 0, y: 0 }, { id: 'child_delay', config: { delay: 400 } })
            ],
            connections: []
        };
        const definition = {
            id: 'nested-timeout',
            name: 'Nested timeout',
            nodes: [
                registry.createNode('loop', { x: 0, y: 0 }, { id: 'loop_n', config: { workflow: 'workflows.child', iterations: 5 } })
            ],
            connections: []
        };
        const started = Date.now();
        const result = await service.execute(definition, { workflows: { child } }, { timeout: 80 });
        const elapsed = Date.now() - started;
        expect(result.success).toBe(false);
        expect(result.data?.status).toBe('cancelled');
        expect(String(result.error?.message || '')).toContain('timed out');
        expect(elapsed).toBeLessThan(600);
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
        const joined = snapshot.nodeStates.join_p.result?.data?.joined as any[];
        expect(Array.isArray(joined)).toBe(true);
        expect(joined.length).toBe(2);
        expect(joined.map(item => item.nodeId).sort()).toEqual(['delay_a', 'delay_b']);
        expect(snapshot.nodeStates.join_p.result?.data?.branches).toBe(2);
    });

    it('merges join branch objects when the join mode is merge', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_m' }),
            registry.createNode('parallel', { x: 200, y: 0 }, { id: 'parallel_m' }),
            registry.createNode('task', { x: 400, y: -80 }, { id: 'task_left', config: { result: { left: 1 } } }),
            registry.createNode('task', { x: 400, y: 80 }, { id: 'task_right', config: { result: { right: 2 } } }),
            registry.createNode('join', { x: 600, y: 0 }, { id: 'join_m', config: { mode: 'merge', resultField: 'merged' } }),
            registry.createNode('end', { x: 800, y: 0 }, { id: 'end_m' })
        ];
        const edge = (id: string, source: string, target: string) => ({
            id, sourceNodeId: source, sourcePort: 'out', targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'join-merge-test',
            name: 'Join merge test',
            nodes,
            connections: [
                edge('m1', 'start_m', 'parallel_m'),
                edge('m2', 'parallel_m', 'task_left'),
                edge('m3', 'parallel_m', 'task_right'),
                edge('m4', 'task_left', 'join_m'),
                edge('m5', 'task_right', 'join_m'),
                edge('m6', 'join_m', 'end_m')
            ]
        };
        const result = await service.execute(definition, {});
        expect(result.success).toBe(true);
        const merged = result.data?.executionState?.nodeStates.join_m.result?.data?.merged;
        expect(merged.left).toBe(1);
        expect(merged.right).toBe(2);
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
