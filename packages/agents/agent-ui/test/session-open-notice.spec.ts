import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { applyMissingSessionNotice, openSession } from '../src/AgentConsoleSessionOpen';

function makeState(): AgentConsoleSessionState {
    return new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
}

function buildHost(state: AgentConsoleSessionState, exists: boolean) {
    return {
        sessionService: {
            appRpc: {
                request: async (method: string) => {
                    expect(method).toEqual('session.exists');
                    return { exists };
                }
            },
            ensureSession: async (sessionId?: string) => ({ id: sessionId || 'chat-new' }),
            setSessionArchived: async () => undefined
        },
        options: {},
        state,
        translator: null,
        transcriptNavigationController: { setFocused: () => undefined },
        queuedPrompts: new Map<string, any[]>(),
        openSessionRequestId: 0,
        freshSessionScoped: false,
        openReviewRequestId: 0,
        taskViewContextVersion: 0,
        editTargetMessageId: '',
        editDraftBefore: '',
        editAttachmentsBefore: [],
        lastEditSessionMessageId: '',
        editDismissedAt: 0,
        lastEscapeAt: 0,
        isTurnInProgress: () => false,
        persistInputHistory: async () => undefined,
        notifyBusyState: () => undefined,
        updateTerminalTitle: () => undefined,
        refreshSessions: async () => undefined,
        resolveProjectSessionsFor: () => [],
        resolveProjectSessionIdsFor: () => [],
        loadSessionPage: async () => ({ messages: [], sections: [] }),
        refreshTools: async () => undefined,
        refreshPendingApprovals: async () => undefined,
        refreshTodoPlan: async () => undefined,
        loadCodingTasks: async () => [],
        restoreInputHistory: async () => undefined,
        restoreSessionModes: async () => undefined
    } as any;
}

@Suite('unknown --session ids are reported')
export class SessionOpenNoticeTest {

    @Test('a missing explicit id is detected before anything can create it')
    async probeDetectsMissing() {
        const state = makeState();
        const host = buildHost(state, false);
        expect(await applyMissingSessionNotice(host, 'chat-typo')).toBe(true);
        expect(state.notice).toContain('chat-typo');
        expect(state.notice).toContain('was not found');
    }

    @Test('an existing id is not reported')
    async probeIgnoresExisting() {
        const state = makeState();
        expect(await applyMissingSessionNotice(buildHost(state, true), 'chat-existing')).toBe(false);
        expect(state.notice).toEqual('');
    }

    @Test('no explicit id means no probe')
    async probeSkipsFreshStartup() {
        const state = makeState();
        expect(await applyMissingSessionNotice(buildHost(state, false), undefined)).toBe(false);
        expect(state.notice).toEqual('');
    }

    @Test('opening a new session scopes its plan and tasks to itself, not the project history')
    async newSessionDoesNotInheritProjectPlan() {
        const state = makeState();
        const host: any = buildHost(state, true);
        let todoSessionId: string | undefined;
        let taskSessionIds: string[] | undefined;
        host.resolveProjectSessionIdsFor = () => ['chat-old'];
        host.refreshTodoPlan = async (id: string) => { todoSessionId = id; };
        host.loadCodingTasks = async (_id: string, ids: string[]) => { taskSessionIds = ids; return []; };

        await openSession(host, undefined);

        expect(host.freshSessionScoped).toEqual(true);
        expect(todoSessionId).toEqual(state.sessionId);
        expect(taskSessionIds).toEqual([state.sessionId]);
    }

    @Test('an unknown explicit id that has to be created is also scoped to itself')
    async missingIdIsScopedToItself() {
        const state = makeState();
        const host: any = buildHost(state, false);
        let todoSessionId: string | undefined;
        host.resolveProjectSessionIdsFor = () => ['chat-old'];
        host.refreshTodoPlan = async (id: string) => { todoSessionId = id; };

        await openSession(host, 'chat-missing', { missing: true });

        expect(host.freshSessionScoped).toEqual(true);
        expect(todoSessionId).toEqual('chat-missing');
    }

    @Test('a newly created explicit id is scoped to itself')
    async newExplicitIdIsScopedToItself() {
        const state = makeState();
        const host: any = buildHost(state, false);
        let todoSessionId: string | undefined;
        host.resolveProjectSessionIdsFor = () => ['chat-old'];
        host.refreshTodoPlan = async (id: string) => { todoSessionId = id; };

        await openSession(host, 'chat-brand-new', { scoped: true });

        expect(host.freshSessionScoped).toEqual(true);
        expect(todoSessionId).toEqual('chat-brand-new');
    }

    @Test('openSession keeps the notice for a missing resume and clears it otherwise')
    async openSessionShowsNotice() {
        const missing = makeState();
        await openSession(buildHost(missing, false), 'chat-typo', { missing: true });
        expect(missing.notice).toContain('chat-typo');

        const resumed = makeState();
        await openSession(buildHost(resumed, true), 'chat-existing', { missing: false });
        expect(resumed.notice).toEqual('');
        expect(resumed.openSessionIds).toContain('chat-existing');
    }
}
