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

    it('routes one message per function output', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_m' }),
            registry.createNode('function', { x: 200, y: 0 }, {
                id: 'function_m',
                config: {
                    outputs: 2,
                    code: 'return [{ ...msg, payload: "a" }, { ...msg, payload: "b" }];'
                }
            }),
            registry.createNode('log', { x: 400, y: -80 }, { id: 'log_a', config: { field: 'payload' } }),
            registry.createNode('log', { x: 400, y: 80 }, { id: 'log_b', config: { field: 'payload' } })
        ];
        const definition = {
            id: 'function-multi-output',
            name: 'Function multi output',
            nodes,
            connections: [
                { id: 'e1', sourceNodeId: 'start_m', sourcePort: 'out', targetNodeId: 'function_m', targetPort: 'in' },
                { id: 'e2', sourceNodeId: 'function_m', sourcePort: 'out', targetNodeId: 'log_a', targetPort: 'in' },
                { id: 'e3', sourceNodeId: 'function_m', sourcePort: 'out-2', targetNodeId: 'log_b', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        const states = result.data?.executionState?.nodeStates || {};
        expect(result.success).toBe(true);
        expect(states.function_m.result?.data?.outputs).toHaveLength(2);
        expect(states.log_a.result?.data?.message).toBe('a');
        expect(states.log_b.result?.data?.message).toBe('b');
    });

    it('keeps array results for single-output functions', async () => {
        const definition = {
            id: 'function-array-result',
            name: 'Function array result',
            nodes: [
                registry.createNode('start', { x: 0, y: 0 }, { id: 'start_arr' }),
                registry.createNode('function', { x: 200, y: 0 }, {
                    id: 'function_arr',
                    config: { code: 'return [1, 2, 3];' }
                })
            ],
            connections: [
                { id: 'e1', sourceNodeId: 'start_arr', sourcePort: 'out', targetNodeId: 'function_arr', targetPort: 'in' }
            ]
        };
        const result = await service.execute(definition, {});
        expect(result.data?.executionState?.nodeStates.function_arr.result?.data?.result).toEqual([1, 2, 3]);
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

    it('joins branch results as text', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_s' }),
            registry.createNode('parallel', { x: 200, y: 0 }, { id: 'parallel_s' }),
            registry.createNode('task', { x: 400, y: -80 }, { id: 'task_x', config: { result: { value: 'x' } } }),
            registry.createNode('task', { x: 400, y: 80 }, { id: 'task_y', config: { result: { value: 'y' } } }),
            registry.createNode('join', { x: 600, y: 0 }, {
                id: 'join_s',
                config: { mode: 'string', joiner: ',', resultField: 'text' }
            })
        ];
        const edge = (id: string, source: string, sourcePort: string, target: string) => ({
            id, sourceNodeId: source, sourcePort, targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'join-string-test',
            name: 'Join string test',
            nodes,
            connections: [
                edge('e1', 'start_s', 'out', 'parallel_s'),
                edge('e2', 'parallel_s', 'out', 'task_x'),
                edge('e3', 'parallel_s', 'out', 'task_y'),
                edge('e4', 'task_x', 'out', 'join_s'),
                edge('e5', 'task_y', 'out', 'join_s')
            ]
        };
        const result = await service.execute(definition, {});
        const joined = String(result.data?.executionState?.nodeStates.join_s.result?.data?.text ?? '');
        expect(joined.includes('"value":"x"')).toBe(true);
        expect(joined.includes('"value":"y"')).toBe(true);
        // One JSON blob per branch, separated by the configured joiner.
        expect(joined.split('},{').length).toBe(2);
    });

    it('keys join branch results by a property', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_k' }),
            registry.createNode('parallel', { x: 200, y: 0 }, { id: 'parallel_k' }),
            registry.createNode('task', { x: 400, y: -80 }, { id: 'task_a', config: { result: { key: 'a', value: 1 } } }),
            registry.createNode('task', { x: 400, y: 80 }, { id: 'task_b', config: { result: { key: 'b', value: 2 } } }),
            registry.createNode('join', { x: 600, y: 0 }, { id: 'join_k', config: { mode: 'key', keyField: 'key', valueField: 'value', resultField: 'keyed' } }),
            registry.createNode('end', { x: 800, y: 0 }, { id: 'end_k' })
        ];
        const edge = (id: string, source: string, target: string) => ({
            id, sourceNodeId: source, sourcePort: 'out', targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'join-key-test',
            name: 'Join key test',
            nodes,
            connections: [
                edge('k1', 'start_k', 'parallel_k'),
                edge('k2', 'parallel_k', 'task_a'),
                edge('k3', 'parallel_k', 'task_b'),
                edge('k4', 'task_a', 'join_k'),
                edge('k5', 'task_b', 'join_k'),
                edge('k6', 'join_k', 'end_k')
            ]
        };
        const result = await service.execute(definition, {});
        expect(result.success).toBe(true);
        expect(result.data?.executionState?.nodeStates.join_k.result?.data?.keyed).toEqual({
            a: 1,
            b: 2
        });
    });

    it('joins the first N branches in count mode', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_cn' }),
            registry.createNode('parallel', { x: 200, y: 0 }, { id: 'parallel_cn' }),
            registry.createNode('delay', { x: 400, y: -80 }, { id: 'delay_a', config: { delay: 10 } }),
            registry.createNode('delay', { x: 400, y: 0 }, { id: 'delay_b', config: { delay: 20 } }),
            registry.createNode('delay', { x: 400, y: 80 }, { id: 'delay_c', config: { delay: 120 } }),
            registry.createNode('join', { x: 600, y: 0 }, { id: 'join_cn', config: { mode: 'count', count: 2 } }),
            registry.createNode('end', { x: 800, y: 0 }, { id: 'end_cn' })
        ];
        const edge = (id: string, source: string, target: string) => ({
            id, sourceNodeId: source, sourcePort: 'out', targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'join-count-test',
            name: 'Join count test',
            nodes,
            connections: [
                edge('c1', 'start_cn', 'parallel_cn'),
                edge('c2', 'parallel_cn', 'delay_a'),
                edge('c3', 'parallel_cn', 'delay_b'),
                edge('c4', 'parallel_cn', 'delay_c'),
                edge('c5', 'delay_a', 'join_cn'),
                edge('c6', 'delay_b', 'join_cn'),
                edge('c7', 'delay_c', 'join_cn'),
                edge('c8', 'join_cn', 'end_cn')
            ]
        };
        const result = await service.execute(definition, {});
        const joined = result.data?.executionState?.nodeStates.join_cn.result?.data?.joined;
        expect(result.success).toBe(true);
        expect(Array.isArray(joined)).toBe(true);
        expect(joined.length).toBe(2);
        expect(result.data?.executionState.nodeStates.end_cn.status).toBe('success');
    });

    it('joins settled branches after the join timeout', async () => {
        const nodes = [
            registry.createNode('start', { x: 0, y: 0 }, { id: 'start_tm' }),
            registry.createNode('parallel', { x: 200, y: 0 }, { id: 'parallel_tm' }),
            registry.createNode('delay', { x: 400, y: -80 }, { id: 'delay_fast', config: { delay: 20 } }),
            registry.createNode('delay', { x: 400, y: 0 }, { id: 'delay_slow', config: { delay: 40 } }),
            registry.createNode('delay', { x: 400, y: 80 }, { id: 'delay_late', config: { delay: 300 } }),
            registry.createNode('join', { x: 600, y: 0 }, { id: 'join_tm', config: { mode: 'timeout', timeout: 80 } }),
            registry.createNode('end', { x: 800, y: 0 }, { id: 'end_tm' })
        ];
        const edge = (id: string, source: string, target: string) => ({
            id, sourceNodeId: source, sourcePort: 'out', targetNodeId: target, targetPort: 'in'
        });
        const definition = {
            id: 'join-timeout-test',
            name: 'Join timeout test',
            nodes,
            connections: [
                edge('m1', 'start_tm', 'parallel_tm'),
                edge('m2', 'parallel_tm', 'delay_fast'),
                edge('m3', 'parallel_tm', 'delay_slow'),
                edge('m4', 'parallel_tm', 'delay_late'),
                edge('m5', 'delay_fast', 'join_tm'),
                edge('m6', 'delay_slow', 'join_tm'),
                edge('m7', 'delay_late', 'join_tm'),
                edge('m8', 'join_tm', 'end_tm')
            ]
        };
        const result = await service.execute(definition, {});
        const joined = result.data?.executionState?.nodeStates.join_tm.result?.data?.joined;
        expect(result.success).toBe(true);
        expect(Array.isArray(joined)).toBe(true);
        expect(joined.length).toBe(2);
        expect(result.data?.executionState.nodeStates.end_tm.status).toBe('success');
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
