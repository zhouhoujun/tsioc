import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { getTodoPlan, getTodoPlans, listCodingTasks, sessionIdList } from '../src/app-rpc/session-aggregation';

function deps(overrides: Partial<{
    authorized: string[];
    deny: string[];
    plans: Record<string, any[]>;
    tasks: Record<string, any[]>;
}> = {}) {
    const authorized: string[] = [];
    const planReads: string[] = [];
    const taskReads: string[] = [];
    const deny = new Set(overrides.deny || []);
    return {
        authorized,
        planReads,
        taskReads,
        deps: {
            authorize: async (sessionId: string) => {
                if (deny.has(sessionId)) {
                    throw new Error('Forbidden');
                }
                authorized.push(sessionId);
            },
            readTodoPlan: async (sessionId: string) => {
                planReads.push(sessionId);
                return overrides.plans?.[sessionId] || [];
            },
            listCodingTasks: async (sessionId: string) => {
                taskReads.push(sessionId);
                return overrides.tasks?.[sessionId] || [];
            },
            requireSessionId: (params: any) => {
                const value = String(params?.sessionId || '').trim();
                if (!value) {
                    throw new Error('Invalid params: sessionId');
                }
                return value;
            }
        }
    };
}

@Suite('session aggregation RPC helpers')
export class SessionAggregationTest {

    @Test('sessionIdList trims, dedupes and bounds')
    idsNormalized() {
        expect(sessionIdList([' a ', 'a', '', 'b', 5])).toEqual(['a', 'b']);
        expect(sessionIdList(undefined)).toEqual([]);
        expect(sessionIdList(Array.from({ length: 600 }, (_, i) => `s${i}`)).length).toEqual(500);
    }

    @Test('todo.get_many reads every session in one call')
    async todoPlansBatch() {
        const harness = deps({
            plans: {
                s1: [{ id: 't1', content: 'a', status: 'pending' }],
                s2: [{ id: 't2', content: 'b', status: 'completed' }]
            }
        });
        const result = await getTodoPlans({ sessionIds: ['s1', 's2', 's1'] }, harness.deps as any);
        expect(Object.keys(result.plans).sort()).toEqual(['s1', 's2']);
        expect(result.plans.s1[0].id).toEqual('t1');
        expect(harness.planReads.sort()).toEqual(['s1', 's2']);
    }

    @Test('todo.get_many omits sessions the caller cannot read')
    async todoPlansSkipsForbidden() {
        const harness = deps({ deny: ['s2'], plans: { s1: [{ id: 't1', content: 'a', status: 'pending' }] } });
        const result = await getTodoPlans({ sessionIds: ['s1', 's2'] }, harness.deps as any);
        expect(Object.keys(result.plans)).toEqual(['s1']);
        expect(harness.planReads).toEqual(['s1']);
    }

    @Test('todo.get keeps its single-session shape and summary')
    async todoPlanSingle() {
        const harness = deps({ plans: { s1: [{ id: 't1', content: 'a', status: 'pending' }, { id: 't2', content: 'b', status: 'completed' }] } });
        const result = await getTodoPlan({ sessionId: 's1' }, harness.deps as any);
        expect(result.sessionId).toEqual('s1');
        expect(result.todos.length).toEqual(2);
        expect(result.summary).toEqual({ total: 2, pending: 1, in_progress: 0, completed: 1, cancelled: 0 });
        expect(harness.authorized).toEqual(['s1']);
    }

    @Test('coding_task.list batches when sessionIds is provided')
    async codingTasksBatch() {
        const harness = deps({
            tasks: {
                s1: [{ id: 'a' }],
                s2: [{ id: 'b' }, { id: 'c' }]
            }
        });
        const result = await listCodingTasks({ sessionIds: ['s1', 's2'] }, harness.deps as any);
        expect(result.total).toEqual(3);
        expect(result.tasks.map((task: any) => task.sourceSessionId)).toEqual(['s1', 's2', 's2']);
        expect(harness.taskReads).toEqual(['s1', 's2']);
    }

    @Test('coding_task.list keeps the single-session request working')
    async codingTasksSingle() {
        const harness = deps({ tasks: { s1: [{ id: 'a' }] } });
        const result = await listCodingTasks({ sessionId: 's1' }, harness.deps as any);
        expect(result.sessionId).toEqual('s1');
        expect(result.tasks.length).toEqual(1);
        expect(result.tasks[0].sourceSessionId).toBeUndefined();
    }

    @Test('a forbidden session is skipped without failing the batch')
    async codingTasksSkipForbidden() {
        const harness = deps({ deny: ['s2'], tasks: { s1: [{ id: 'a' }], s2: [{ id: 'b' }] } });
        const result = await listCodingTasks({ sessionIds: ['s1', 's2'] }, harness.deps as any);
        expect(result.tasks.map((task: any) => task.id)).toEqual(['a']);
    }
}
