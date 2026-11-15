import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { buildWorkRows, runWorkCommandView } from '../src/AgentConsoleWork';

const TREE = {
    sessionId: 'root',
    status: 'running',
    children: [
        { sessionId: 'child-a', kind: 'worker', status: 'running', children: [] },
        { sessionId: 'child-b', kind: 'review', status: 'completed', children: [] }
    ]
};

const TASKS = [
    { id: 't1', sessionId: 'child-a', status: 'running', goal: 'scan repository', startedAt: 1 },
    { id: 't2', sessionId: 'root', status: 'queued', goal: 'prepare release', startedAt: 2 }
];

function createState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'root', workspace: '' });
    state.setSessions([
        { id: 'root', current: true, title: 'Main session' } as any,
        { id: 'child-a', current: false, title: 'Worker A', sessionRole: 'worker' } as any,
        { id: 'child-b', current: false, title: 'Reviewer B', sessionRole: 'review' } as any
    ]);
    return state;
}

@Suite('work tree projection')
export class WorkTreeTest {
    @Test('flattens sessions and background tasks with depth and status')
    projects() {
        const rows = buildWorkRows({ currentSessionId: 'root', tree: TREE, tasks: TASKS, sessions: createState().sessions });
        expect(rows.map(row => row.value)).toEqual([
            'session:root',
            'task:t2:root',
            'session:child-a',
            'task:t1:child-a',
            'session:child-b'
        ]);
        expect(rows.map(row => row.depth)).toEqual([0, 1, 1, 2, 1]);
        expect(rows[0].label).toContain('Main session');
        expect(rows[0].label.startsWith('●')).toEqual(true);
        expect(rows[2].label.startsWith('  ●')).toEqual(true);
        expect(rows[4].label).toContain('Reviewer B');
        expect(rows[4].status).toEqual('completed');
    }

    @Test('falls back to the current session when no delegation tree exists')
    rowsWithoutTree() {
        const rows = buildWorkRows({ currentSessionId: 'root', tasks: [TASKS[1]], sessions: createState().sessions });
        expect(rows.map(row => row.value)).toEqual(['session:root', 'task:t2:root']);
    }

    @Test('/work opens the selected session and task owners')
    async opensSessions() {
        const state = createState();
        const opened: string[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                getDelegationTree: async () => TREE,
                listAllBackgroundTasks: async () => TASKS
            },
            notify: () => undefined,
            openSession: async (sessionId?: string) => { opened.push(sessionId || ''); },
            select: async () => 'session:child-a'
        };
        await runWorkCommandView(host);
        host.select = async () => 'task:t1:child-a';
        await runWorkCommandView(host);
        expect(opened).toEqual(['child-a', 'child-a']);
    }

    @Test('/work reports an empty tree instead of opening an empty menu')
    async emptyTree() {
        const state = createState();
        const notices: string[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                getDelegationTree: async () => null,
                listAllBackgroundTasks: async () => []
            },
            notify: (message: string) => notices.push(message),
            openSession: async () => undefined
        };
        // Empty tree still shows the current session row; a host without the
        // service reports the unavailable state instead.
        host.select = async () => undefined;
        await runWorkCommandView(host);
        expect(notices).toEqual([]);
        host.sessionService = null;
        await runWorkCommandView(host);
        expect(notices[0]).toContain('unavailable');
    }
}
