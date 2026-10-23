import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mergeTodoPlanForSessionsView } from '../src/AgentConsoleTodoPlanCommands';
import { loadProjectCodingTasks } from '../src/AgentConsoleCodingTaskLoad';

interface RecordedCall {
    method: string;
    params: any;
}

function makeHost(sessionId: string, response: (method: string, params: any) => any) {
    const calls: RecordedCall[] = [];
    const cleared: number[] = [];
    const host = {
        calls,
        cleared,
        appRpc: {
            request: async (method: string, params: any) => {
                calls.push({ method, params });
                return response(method, params);
            }
        },
        state: {
            sessionId,
            clearPlanTodos: () => { cleared.push(1); }
        },
        loadLocalTodoPlan: async () => [],
        normalizeTodoStatus: (status: unknown) => {
            switch (String(status || '')) {
                case 'in_progress': return 'in_progress' as const;
                case 'completed': return 'completed' as const;
                case 'cancelled': return 'cancelled' as const;
                default: return 'pending' as const;
            }
        }
    } as any;
    return host;
}

const sessions = [
    { id: 's-new', updatedAt: 300 },
    { id: 's-old', updatedAt: 100 },
    { id: 's-mid', updatedAt: 200 }
];

@Suite('session open aggregation is batched')
export class SessionOpenBatchingTest {

    @Test('the todo merge reads every session plan with one RPC')
    async todoMergeBatches() {
        const host = makeHost('s-new', (method, params) => {
            if (method === 'todo.get_many') {
                expect(params.sessionIds).toEqual(['s-new', 's-mid', 's-old']);
                return {
                    plans: {
                        's-new': [{ id: 't1', content: 'ship', status: 'in_progress' }],
                        's-mid': [{ id: 't2', content: 'old', status: 'completed' }],
                        's-old': []
                    }
                };
            }
            throw new Error(`unexpected ${method}`);
        });

        const merged = await mergeTodoPlanForSessionsView(host, 's-new', sessions);
        expect(host.calls.length).toEqual(1);
        expect(host.calls[0].method).toEqual('todo.get_many');
        expect(merged?.todos.map((todo: any) => todo.id)).toEqual(['t1']);
        expect(merged?.sourceSessionId).toEqual('s-new');
    }

    @Test('a gateway without todo.get_many falls back to per-session todo.get')
    async todoMergeFallsBack() {
        const host = makeHost('s-new', (method, params) => {
            if (method === 'todo.get_many') {
                throw new Error('Method not found');
            }
            if (method === 'todo.get') {
                return { todos: params.sessionId === 's-old' ? [{ id: 't9', content: 'legacy', status: 'pending' }] : [] };
            }
            throw new Error(`unexpected ${method}`);
        });

        const merged = await mergeTodoPlanForSessionsView(host, 's-new', sessions);
        expect(host.calls[0].method).toEqual('todo.get_many');
        expect(host.calls.filter((call: RecordedCall) => call.method === 'todo.get').length).toEqual(3);
        expect(merged?.todos.map((todo: any) => todo.id)).toEqual(['t9']);
        expect(merged?.sourceSessionId).toEqual('s-old');
    }

    @Test('a single related session keeps the direct todo.get call')
    async singleSessionUsesDirectCall() {
        const host = makeHost('s1', (method) => {
            if (method === 'todo.get') {
                return { todos: [{ id: 't1', content: 'solo', status: 'pending' }] };
            }
            throw new Error(`unexpected ${method}`);
        });
        const merged = await mergeTodoPlanForSessionsView(host, 's1', [{ id: 's1', updatedAt: 1 }]);
        expect(host.calls.map((call: RecordedCall) => call.method)).toEqual(['todo.get']);
        expect(merged?.todos.map((todo: any) => todo.id)).toEqual(['t1']);
    }

    @Test('coding tasks load with one batched RPC and keep sourceSessionId')
    async codingTasksBatch() {
        const calls: RecordedCall[] = [];
        const rpc = {
            request: async (method: string, params: any) => {
                calls.push({ method, params });
                return {
                    tasks: [
                        { id: 'task-1', title: 'a', sourceSessionId: 's-new' },
                        { id: 'task-2', title: 'b', sourceSessionId: 's-old' }
                    ]
                };
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
        } as any;
        const tasks = await loadProjectCodingTasks(rpc, ['s-new', 's-old', 's-mid']);
        expect(calls.length).toEqual(1);
        expect(calls[0].method).toEqual('coding_task.list');
        expect(calls[0].params.sessionIds).toEqual(['s-new', 's-old', 's-mid']);
        expect(tasks.map((task: any) => task.sourceSessionId)).toEqual(['s-new', 's-old']);
    }

    @Test('coding tasks fall back to per-session calls when batching is unavailable')
    async codingTasksFallBack() {
        const calls: RecordedCall[] = [];
        const rpc = {
            request: async (method: string, params: any) => {
                calls.push({ method, params });
                if (params.sessionIds) {
                    throw new Error('Method not found');
                }
                return { tasks: [{ id: `task-${params.sessionId}` }] };
            }
        } as any;
        const tasks = await loadProjectCodingTasks(rpc, ['s1', 's2']);
        expect(calls[0].params.sessionIds).toEqual(['s1', 's2']);
        expect(calls.filter(call => !call.params.sessionIds).length).toEqual(2);
        expect(tasks.map((task: any) => task.sourceSessionId).sort()).toEqual(['s1', 's2']);
    }
}
