import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { buildInboxItems, runInboxCommandView } from '../src/AgentConsoleInbox';

function createState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
    state.configure({ sessionId: 'root', workspace: '' });
    return state;
}

@Suite('attention inbox')
export class InboxTest {
    @Test('orders by severity and kind, filtering finished or healthy work')
    derives() {
        const items = buildInboxItems({
            currentSessionId: 'root',
            approvals: [{ id: 'a1', sessionId: 'root', toolName: 'terminal' }],
            questions: [{ questionId: 'q1', sessionId: 'root', question: 'pick one', severity: 'high' }],
            backgroundTasks: [
                { id: 't-fail', sessionId: 'root', status: 'failed', goal: 'build' },
                { id: 't-done', sessionId: 'root', status: 'completed', goal: 'done' }
            ],
            codingTasks: [
                { id: 'c-blocked', sessionId: 'root', status: 'blocked', title: 'review' },
                { id: 'c-ok', sessionId: 'root', status: 'completed', title: 'ok' }
            ],
            queuedPromptCount: 2
        });
        expect(items.map(item => item.kind)).toEqual(['question', 'task', 'approval', 'coding-task', 'queued']);
        expect(items[0].severity).toEqual('error');
        expect(items[1].severity).toEqual('error');
        expect(items[2].severity).toEqual('warn');
        expect(items[3].severity).toEqual('warn');
        expect(items[4].title).toEqual('2');
    }

    @Test('workers waiting for input or blocked surface as attention items')
    waitingInput() {
        const items = buildInboxItems({
            currentSessionId: 'root',
            backgroundTasks: [
                { id: 'wait', sessionId: 'child', status: 'waiting-input', goal: 'need a choice', question: 'which branch?' },
                { id: 'blocked', sessionId: 'child', status: 'blocked', goal: 'stuck', error: 'dependency missing' }
            ]
        });
        expect(items.map(item => item.id)).toEqual(['task:wait', 'task:blocked']);
        expect(items[0]).toMatchObject({ kind: 'task', severity: 'warn', detail: 'which branch?' });
        expect(items[1]).toMatchObject({ kind: 'task', severity: 'warn', detail: 'dependency missing' });
    }

    @Test('recent completed workers surface as idle reports, old ones do not')
    idleReports() {
        const now = 1_000_000;
        const items = buildInboxItems({
            currentSessionId: 'root',
            now,
            backgroundTasks: [
                { id: 'recent', sessionId: 'root', status: 'completed', goal: 'scan', finishedAt: now - 60_000, result: { summary: 'found 3 issues' } },
                { id: 'old', sessionId: 'root', status: 'completed', goal: 'old scan', finishedAt: now - 60 * 60_000 },
                { id: 'running', sessionId: 'root', status: 'running', goal: 'busy' }
            ]
        });
        expect(items.map(item => item.kind)).toEqual(['idle-report']);
        expect(items[0].id).toEqual('idle-report:recent');
        expect(items[0].severity).toEqual('info');
        expect(items[0].detail).toEqual('found 3 issues');
    }

    @Test('/inbox jumps to the owning session and focuses its approval')
    async opensApproval() {
        const state = createState();
        const opened: string[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                listApprovals: async () => [{ id: 'a1', sessionId: 'other', toolName: 'terminal' }],
                listAllBackgroundTasks: async () => []
            },
            loadCodingTasks: async () => [],
            notify: () => undefined,
            openSession: async (sessionId?: string) => { opened.push(sessionId || ''); },
            select: async () => 'approval:a1'
        };
        await runInboxCommandView(host);
        expect(opened).toEqual(['other']);
        expect(state.pendingApprovals.map(item => item.id)).toEqual(['a1']);
        expect(state.approvalsFocused).toEqual(true);
    }

    @Test('/inbox can approve or deny without leaving the inbox')
    async decidesApproval() {
        const state = createState();
        const decisions: Array<[string, string]> = [];
        const notices: string[] = [];
        const opened: string[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                listApprovals: async () => [{ id: 'a1', sessionId: 'other', toolName: 'terminal' }],
                listAllBackgroundTasks: async () => []
            },
            loadCodingTasks: async () => [],
            notify: (message: string) => notices.push(message),
            openSession: async (sessionId?: string) => { opened.push(sessionId || ''); },
            select: async (title: string) => title === 'Approval action' ? 'deny' : 'approval:a1',
            decideApproval: async (requestId: string, decision: 'approve' | 'deny') => {
                decisions.push([requestId, decision]);
                return true;
            }
        };
        await runInboxCommandView(host);
        expect(decisions).toEqual([['a1', 'deny']]);
        expect(opened).toEqual([]);
        expect(notices[0]).toContain('a1');
        expect(state.approvalsFocused).toEqual(false);
    }

    @Test('/inbox can cancel a background worker in place')
    async cancelsTask() {
        const state = createState();
        const cancelled: string[] = [];
        const notices: string[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: {
                listApprovals: async () => [],
                listAllBackgroundTasks: async () => [{ id: 'task-1', sessionId: 'child', status: 'failed', goal: 'build' }]
            },
            loadCodingTasks: async () => [],
            notify: (message: string) => notices.push(message),
            openSession: async () => undefined,
            select: async (title: string) => title === 'Background task' ? 'cancel' : 'task:task-1',
            cancelTask: async (taskId: string) => { cancelled.push(taskId); return true; }
        };
        await runInboxCommandView(host);
        expect(cancelled).toEqual(['task-1']);
        expect(notices[0]).toContain('Cancelled background task task-1');
    }

    @Test('/inbox reports an empty queue instead of opening an empty menu')
    async empty() {
        const state = createState();
        const notices: string[] = [];
        const host: any = {
            translator: null,
            state,
            sessionService: { listApprovals: async () => [], listAllBackgroundTasks: async () => [] },
            loadCodingTasks: async () => [],
            notify: (message: string) => notices.push(message),
            openSession: async () => undefined,
            select: async () => undefined
        };
        await runInboxCommandView(host);
        expect(notices.length).toEqual(1);
        expect(notices[0]).toContain('Nothing needs your attention');
    }
}
