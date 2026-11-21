import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { buildWorkRows, runWorkCommandView, workCommandHost } from '../src/AgentConsoleWork';

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
    rowsWithoutTree() {        const rows = buildWorkRows({ currentSessionId: 'root', tasks: [TASKS[1]], sessions: createState().sessions });
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

    @Test('work surfaces remote centers as one read-only entry')
    async remoteCentersEntry() {        const state = createState();
        state.remoteCenters = [{ name: 'laptop', url: 'http://laptop:3200' }];
        let options: any[] = [];
        let openedRemotes = 0;
        const host: any = {
            translator: null,
            state,
            sessionService: {
                getDelegationTree: async () => TREE,
                listAllBackgroundTasks: async () => TASKS
            },
            notify: () => undefined,
            openSession: async () => undefined,
            select: async (_title: string, opts: any[]) => {
                options = opts;
                return 'remotes';
            },
            openRemoteCenters: async () => { openedRemotes += 1; }
        };
        await runWorkCommandView(host);
        const entry = options.find(option => option.value === 'remotes');
        expect(entry?.label).toContain('1');
        expect(openedRemotes).toEqual(1);

        // Without configured centers the row must not appear.
        state.remoteCenters = [];
        options = [];
        host.select = async (_title: string, opts: any[]) => { options = opts; return undefined; };
        await runWorkCommandView(host);
        expect(options.some(option => option.value === 'remotes')).toEqual(false);
    }

    @Test('/work remote merges gateways into one read-only tree')
    async remoteTree() {
        const state = createState();
        state.remoteCenters = [{ name: 'laptop', url: 'http://laptop:3200' }];
        const overlays: Array<{ title: string; lines: string[] }> = [];
        let options: any[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: { getDelegationTree: async () => null, listAllBackgroundTasks: async () => [] },
            notify: () => undefined,
            openSession: async () => undefined,
            remoteCenters: [{ name: 'laptop', url: 'http://laptop:3200' }],
            probeRemoteCenter: async (remote: any) => ({
                remote,
                ok: true,
                sessions: [{ id: 'r1', title: 'Remote task', messageCount: 3, updatedAt: Date.now() }]
            }),
            select: async (_title: string, opts: any[]) => {
                options = opts;
                return 'remote-session:laptop:r1';
            },
            openTextOverlay: (title: string, lines: string[]) => { overlays.push({ title, lines }); }
        };
        await runWorkCommandView(host, 'remote');
        expect(options.map(option => option.value)).toEqual(['remote:laptop', 'remote-session:laptop:r1']);
        expect(overlays.length).toEqual(1);
        const text = overlays[0].lines.join('\n');
        expect(text).toContain('Remote task');
        expect(text).toContain('http://laptop:3200');
        expect(text).toContain('read-only');
    }

    @Test('/work all merges local delegation and remote gateways in one tree')
    async allTree() {
        const state = createState();
        state.remoteCenters = [{ name: 'laptop', url: 'http://laptop:3200' }];
        const overlays: Array<{ title: string; lines: string[] }> = [];
        const opened: string[] = [];
        let options: any[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: { getDelegationTree: async () => TREE, listAllBackgroundTasks: async () => TASKS },
            notify: () => undefined,
            openSession: async (sessionId?: string) => { opened.push(sessionId || ''); },
            remoteCenters: [{ name: 'laptop', url: 'http://laptop:3200' }],
            probeRemoteCenter: async (remote: any) => ({
                remote, ok: true, sessions: [{ id: 'r1', title: 'Remote task', messageCount: 1, updatedAt: Date.now() }]
            }),
            select: async (_title: string, opts: any[]) => {
                options = opts;
                return 'remote-session:laptop:r1';
            },
            openTextOverlay: (title: string, lines: string[]) => { overlays.push({ title, lines }); }
        };
        await runWorkCommandView(host, 'all');
        const values = options.map(option => option.value);
        expect(values).toContain('session:root');
        expect(values).toContain('remote-session:laptop:r1');
        expect(values.indexOf('session:root')).toBeLessThan(values.indexOf('remote:laptop'));
        expect(overlays.length).toEqual(1);

        host.select = async (_title: string, opts: any[]) => {
            options = opts;
            return 'session:child-a';
        };
        await runWorkCommandView(host, 'all');
        expect(opened).toEqual(['child-a']);
    }

    @Test('task rows offer open, cancel and dismiss actions')
    async taskActions() {
        const state = createState();
        const opened: string[] = [];
        const cancelled: string[] = [];
        const notices: string[] = [];
        const responses: Array<string | undefined> = [];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                getDelegationTree: async () => TREE,
                listAllBackgroundTasks: async () => TASKS
            },
            notify: (message: string) => notices.push(message),
            openSession: async (sessionId?: string) => { opened.push(sessionId || ''); },
            select: async () => responses.shift(),
            cancelTask: async (taskId: string) => { cancelled.push(taskId); return true; }
        };

        responses.push('task:t1:child-a', 'cancel');
        await runWorkCommandView(host);
        expect(cancelled).toEqual(['t1']);
        expect(opened).toEqual([]);
        expect(notices[0]).toContain('cancelled');

        responses.push('task:t1:child-a', undefined);
        await runWorkCommandView(host);
        expect(opened).toEqual([]);

        responses.push('task:t1:child-a', 'open');
        await runWorkCommandView(host);
        expect(opened).toEqual(['child-a']);
    }

    @Test('/work spawn starts a background worker with an optional profile')
    async spawns() {
        const state = createState();
        const notices: string[] = [];
        const spawned: Array<{ goal: string; profile?: string }> = [];
        const host: any = {
            translator: null,
            state,
            sessionService: null,
            notify: (message: string) => notices.push(message),
            openSession: async () => undefined,
            spawnWorker: async (goal: string, profile?: string) => {
                spawned.push({ goal, profile });
                return { taskId: 'task-9', sessionId: 'child-9' };
            }
        };
        await runWorkCommandView(host, 'spawn --profile plan refactor auth');
        expect(spawned).toEqual([{ goal: 'refactor auth', profile: 'plan' }]);
        expect(notices[0]).toContain('task-9');
        await runWorkCommandView(host, 'spawn');
        expect(notices[1]).toContain('Usage: /work spawn');
    }

    @Test('/work spawn --worktree creates a worktree and passes it to the worker')
    async spawnsInWorktree() {
        const state = createState();
        const notices: string[] = [];
        const spawned: Array<{ goal: string; profile?: string; workspace?: string }> = [];
        const created: Array<string | undefined> = [];
        const host: any = {
            translator: null,
            state,
            sessionService: null,
            notify: (message: string) => notices.push(message),
            openSession: async () => undefined,
            spawnWorker: async (goal: string, profile?: string, workspace?: string) => {
                spawned.push({ goal, profile, workspace });
                return { taskId: 'task-wt', sessionId: 'child-wt' };
            },
            createWorktree: async (name?: string) => {
                created.push(name);
                return '/w/.worktrees/feature';
            }
        };
        await runWorkCommandView(host, 'spawn --worktree=feature refactor auth');
        expect(created).toEqual(['feature']);
        expect(spawned).toEqual([{ goal: 'refactor auth', profile: undefined, workspace: '/w/.worktrees/feature' }]);
        expect(notices[0]).toContain('task-wt');

        host.createWorktree = async () => undefined;
        await runWorkCommandView(host, 'spawn --worktree=broken task');
        expect(notices[notices.length - 1]).toContain('Unable to create a worktree');
        expect(spawned.length).toEqual(1);
    }

    @Test('completed task rows open a read-only worker report')
    async taskReport() {
        const state = createState();
        const overlays: Array<{ title: string; lines: string[] }> = [];
        const responses: Array<string | undefined> = ['task:t3:child-b', 'report'];
        const reportTask = {
            id: 't3', sessionId: 'child-b', status: 'completed', goal: 'review auth',
            startedAt: 3, finishedAt: 4,
            result: {
                summary: 'reviewed auth flow',
                diff: 'src/auth.ts +2 -1',
                completed: ['scan tokens', 'check redirects'],
                nextSteps: ['add tests'],
                risks: ['cookie scope'],
                artifacts: ['auth.patch']
            }
        };
        const host: any = {
            translator: null,
            state,
            sessionService: {
                getDelegationTree: async () => TREE,
                listAllBackgroundTasks: async () => [reportTask]
            },
            notify: () => undefined,
            openSession: async () => undefined,
            select: async () => responses.shift(),
            openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
        };
        await runWorkCommandView(host);
        expect(overlays.length).toEqual(1);
        expect(overlays[0].title).toEqual('Worker report');
        const text = overlays[0].lines.join('\n');
        expect(text).toContain('Goal: review auth');
        expect(text).toContain('Summary: reviewed auth flow');
        expect(text).toContain('Diff: src/auth.ts +2 -1');
        expect(text).toContain('Next steps: add tests');
        expect(text).toContain('Artifacts: auth.patch');
    }

    @Test('/work spawn --worktree without a name offers existing worktrees and a new option')
    async picksWorktree() {
        const state = createState();
        const spawned: Array<{ goal: string; workspace?: string }> = [];
        let created = 0;
        const host: any = {
            translator: null,
            state,
            sessionService: null,
            notify: () => undefined,
            openSession: async () => undefined,
            spawnWorker: async (goal: string, _profile?: string, workspace?: string) => {
                spawned.push({ goal, workspace });
                return { taskId: 'task-pick' };
            },
            createWorktree: async () => { created += 1; return '/w/.worktrees/new'; },
            listWorktrees: async () => [{ path: '/w/.worktrees/existing', branch: 'wt/existing' }],
            select: async () => '/w/.worktrees/existing'
        };
        await runWorkCommandView(host, 'spawn --worktree refactor auth');
        expect(spawned[0]).toEqual({ goal: 'refactor auth', workspace: '/w/.worktrees/existing' });
        expect(created).toEqual(0);

        host.select = async () => '__new__';
        await runWorkCommandView(host, 'spawn --worktree add tests');
        expect(created).toEqual(1);
        expect(spawned[1]).toEqual({ goal: 'add tests', workspace: '/w/.worktrees/new' });
    }

    @Test('worker worktree creation does not switch the parent session and reuses existing names')    async workerWorktreePort() {
        const requests: any[] = [];
        const ctx: any = {
            state: {
                worktreeCommand: async (request: any) => {
                    requests.push(request);
                    if (request.action === 'create') {
                        if (request.name === 'existing') throw new Error('exists');
                        return { action: 'create', path: '/w/.worktrees/feature', branch: 'wt/feature' };
                    }
                    return {
                        action: 'list',
                        items: [{ path: '/w/.worktrees/existing', branch: 'wt/existing' }]
                    };
                }
            }
        };
        const host = workCommandHost(ctx);
        expect(await host.createWorktree?.('feature')).toEqual('/w/.worktrees/feature');
        expect(requests[0]).toEqual({ action: 'create', name: 'feature', activate: false });
        expect(await host.createWorktree?.('existing')).toEqual('/w/.worktrees/existing');
        expect(requests[requests.length - 1]).toEqual({ action: 'list' });
    }

    @Test('failed task rows can be retried with the same goal')    async retries() {
        const state = createState();
        const spawned: string[] = [];
        const responses: Array<string | undefined> = ['task:t9:root', 'retry'];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                getDelegationTree: async () => ({ sessionId: 'root', status: 'running', children: [] }),
                listAllBackgroundTasks: async () => [
                    { id: 't9', sessionId: 'root', status: 'failed', goal: 'fix flaky test', startedAt: 1 }
                ]
            },
            notify: () => undefined,
            openSession: async () => undefined,
            select: async () => responses.shift(),
            spawnWorker: async (goal: string) => { spawned.push(goal); return { taskId: 'task-10' }; }
        };
        await runWorkCommandView(host);
        expect(spawned).toEqual(['fix flaky test']);
        // Healthy tasks do not offer retry; selecting open only navigates.
        responses.push('task:t9:root', 'open');
        host.sessionService.listAllBackgroundTasks = async () => [
            { id: 't9', sessionId: 'root', status: 'completed', goal: 'done', startedAt: 1 }
        ];
        await runWorkCommandView(host);
        expect(spawned).toEqual(['fix flaky test']);
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
