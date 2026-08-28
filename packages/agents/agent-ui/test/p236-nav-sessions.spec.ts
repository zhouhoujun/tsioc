import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState, AgentConsoleSessionItem, AgentConsoleSelectOption } from '../src';
import { COMMAND_HANDLERS, CommandHandlerContext } from '../src/AgentConsoleCommandHandlers';
import { NavFilter, NavSelection } from '@tsdi/agent';

function sessionsFixture(): AgentConsoleSessionItem[] {
    return [
        {
            id: 'a1',
            current: true,
            workspace: '/w1',
            projectId: 'projecta',
            projectKey: 'k-a',
            primaryThreadId: 'thread-a',
            title: 'A-ONE',
            summary: 'a1 summary',
            messageCount: 3,
            pinned: true
        },
        {
            id: 'a2',
            current: false,
            workspace: '/w1',
            projectId: 'projecta',
            projectKey: 'k-a',
            primaryThreadId: 'thread-a',
            title: 'A-TWO',
            summary: 'a2 summary',
            messageCount: 5,
            pinned: false
        },
        {
            id: 'b1',
            current: false,
            workspace: '/w2',
            projectId: 'projectb',
            projectKey: 'k-b',
            primaryThreadId: 'thread-b',
            title: 'B-ONE',
            summary: 'b1 summary',
            messageCount: 2,
            pinned: false
        }
    ];
}

function newState(): AgentConsoleSessionState {
    const state = new AgentConsoleSessionState();
    state.configure({ sessionId: 's1' });
    return state;
}

@Suite('p236 nav-filtered sessions list (P236 part B)')
export class NavFilteredSessionsTest {

    @Test('empty filter returns the full session list unchanged')
    testEmptyFilter() {
        const state = newState();
        const fixture = sessionsFixture();
        state.setSessions(fixture);
        expect(state.navFilteredSessions).toEqual(fixture);
        state.setNavFilter(undefined);
        expect(state.navFilteredSessions).toEqual(fixture);
        state.setNavFilter({});
        expect(state.navFilteredSessions).toEqual(fixture);
    }

    @Test('text filter matches id, title, summary and project fields case-insensitively')
    testTextFilter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ text: 'a1' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1']);
        state.setNavFilter({ text: 'TWO' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a2']);
        state.setNavFilter({ text: 'k-b' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['b1']);
        state.setNavFilter({ text: 'thread-b' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['b1']);
        state.setNavFilter({ text: '/w2' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['b1']);
    }

    @Test('workspace filter matches the session workspace exactly')
    testWorkspaceFilter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ workspace: '/w1' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1', 'a2']);
        state.setNavFilter({ workspace: '/w2' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['b1']);
        state.setNavFilter({ workspace: '/missing' });
        expect(state.navFilteredSessions).toEqual([]);
    }

    @Test('projectId filter matches either projectId or projectKey')
    testProjectIdFilter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1', 'a2']);
        state.setNavFilter({ projectId: 'k-b' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['b1']);
        state.setNavFilter({ projectId: 'none' });
        expect(state.navFilteredSessions).toEqual([]);
    }

    @Test('threadId filter matches the primaryThreadId exactly')
    testThreadIdFilter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ threadId: 'thread-a' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1', 'a2']);
        state.setNavFilter({ threadId: 'thread-b' });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['b1']);
    }

    @Test('pinnedOnly filter keeps only pinned sessions')
    testPinnedOnlyFilter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ pinnedOnly: true });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1']);
    }

    @Test('filters combine with AND semantics')
    testCombinedFilters() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ workspace: '/w1', pinnedOnly: true });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1']);
        state.setNavFilter({ text: 'one', pinnedOnly: true });
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1']);
    }
}

@Suite('p236 cursor over nav-filtered sessions (P236 part B)')
export class FilteredCursorTest {

    @Test('setSelectedSessionId rejects ids outside the filtered list')
    testSetSelectedRejectsOutsideFilter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projectb' });
        state.setSelectedSessionId('b1');
        expect(state.selectedSessionId).toEqual('b1');
        state.setSelectedSessionId('a1');
        expect(state.selectedSessionId).toEqual('b1');
        state.setSelectedSessionId('');
        expect(state.selectedSessionId).toEqual('b1');
    }

    @Test('moveSessionSelection wraps within the filtered list')
    testMoveWrapsWithinFiltered() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        state.setSelectedSessionId('a1');
        state.moveSessionSelection(1);
        expect(state.selectedSessionId).toEqual('a2');
        state.moveSessionSelection(1);
        expect(state.selectedSessionId).toEqual('a1');
        state.moveSessionSelection(-1);
        expect(state.selectedSessionId).toEqual('a2');
    }

    @Test('moveSessionSelectionPage clamps at filtered list bounds')
    testMovePageClamps() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        state.setSelectedSessionId('a1');
        state.moveSessionSelectionPage(5, 10);
        expect(state.selectedSessionId).toEqual('a2');
        state.moveSessionSelectionPage(-5, 10);
        expect(state.selectedSessionId).toEqual('a1');
    }

    @Test('selectFirstSession / selectLastSession operate on the filtered list')
    testFirstLastOnFiltered() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projectb' });
        state.selectFirstSession();
        expect(state.selectedSessionId).toEqual('b1');
        state.setNavFilter({ projectId: 'projecta' });
        state.selectFirstSession();
        expect(state.selectedSessionId).toEqual('a1');
        state.selectLastSession();
        expect(state.selectedSessionId).toEqual('a2');
    }

    @Test('selectedSession resolves within the filtered list')
    testSelectedSessionGetter() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projectb' });
        state.selectFirstSession();
        expect(state.selectedSession?.id).toEqual('b1');
        expect(state.selectedSession?.title).toEqual('B-ONE');
    }
}

@Suite('p236 sessions focus scroll restore/persist (P236 part B)')
export class FocusScrollRoundTripTest {

    @Test('setSessionsFocused(false) persists the selected index into navViewScroll')
    testPersistOnBlur() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setSelectedSessionId('b1');
        state.setSessionsFocused(false);
        expect(state.getNavViewScroll('sessions')).toEqual(2);
        state.setSelectedSessionId('a2');
        state.setSessionsFocused(false);
        expect(state.getNavViewScroll('sessions')).toEqual(1);
    }

    @Test('setSessionsFocused(true) restores selection from navViewScroll and syncs navSelection')
    testRestoreOnFocus() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavViewScroll('sessions', 2);
        state.setSessionsFocused(true);
        expect(state.selectedSessionId).toEqual('b1');
        expect(state.navSelection).toEqual({ type: 'session', id: 'b1', index: 2 });
    }

    @Test('restore keeps an existing valid selection when savedScroll is out of range')
    testRestoreKeepsValidSelection() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavViewScroll('sessions', 99);
        state.setSelectedSessionId('a2');
        state.setSessionsFocused(true);
        expect(state.selectedSessionId).toEqual('a2');
        expect(state.navSelection).toEqual({ type: 'session', id: 'a2', index: 1 });
    }

    @Test('restore falls back to current/first when no selection and savedScroll is 0')
    testRestoreFallsBackToFirst() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setSessionsFocused(true);
        expect(state.selectedSessionId).toEqual('a1');
        expect(state.navSelection).toEqual({ type: 'session', id: 'a1', index: 0 });
    }

    @Test('restore clears selection when the filtered list is empty')
    testRestoreEmptyList() {
        const state = newState();
        state.setNavFilter({ projectId: 'none' });
        state.setSessions(sessionsFixture());
        state.setSelectedSessionId('a1');
        state.setSessionsFocused(true);
        expect(state.selectedSessionId).toEqual('');
    }

    @Test('persist is a no-op when the filtered list is empty')
    testPersistEmptyList() {
        const state = newState();
        state.setNavFilter({ projectId: 'none' });
        state.setSessions(sessionsFixture());
        state.setNavViewScroll('sessions', 1);
        state.setSessionsFocused(false);
        expect(state.getNavViewScroll('sessions')).toEqual(1);
    }

    @Test('focus round-trip: pick inside /projects context then focus /sessions restores the picked session')
    testRoundTripFromProjects() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        state.setNavSelection({ type: 'session', id: 'a2', index: 1 });
        state.setNavViewScroll('sessions', 1);
        state.selectedSessionId = '';
        state.setSessionsFocused(true);
        expect(state.selectedSessionId).toEqual('a2');
        expect(state.navSelection).toEqual({ type: 'session', id: 'a2', index: 1 });
    }
}

@Suite('p236 sessions setSessions re-clamp (P236 part B)')
export class SessionsReclampTest {

    @Test('setSessions keeps a selection that is still present in the filtered list')
    testKeepsValidSelection() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        state.setSelectedSessionId('a2');
        state.setSessions(sessionsFixture());
        expect(state.selectedSessionId).toEqual('a2');
    }

    @Test('setSessions falls back to current/first when the selection left the filtered list')
    testFallsBackWhenSelectionRemoved() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        state.setSelectedSessionId('a2');
        state.setSessions([sessionsFixture()[1]]);
        expect(state.selectedSessionId).toEqual('a2');
        state.setSessions([sessionsFixture()[2]]);
        expect(state.selectedSessionId).toEqual('');
        state.setNavFilter({ projectId: 'projectb' });
        state.setSessions([sessionsFixture()[2]]);
        expect(state.selectedSessionId).toEqual('b1');
    }

    @Test('setSessions clears selection when the filtered list becomes empty')
    testClearsOnEmpty() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setSelectedSessionId('a1');
        state.setNavFilter({ projectId: 'none' });
        state.setSessions(sessionsFixture());
        expect(state.selectedSessionId).toEqual('');
    }
}

@Suite('p236 sessions nav store survives configure (P236 part B)')
export class NavStoreSurvivesConfigureTest {

    @Test('navFilter, navSelection and navViewScroll survive configure()')
    testSurvivesConfigure() {
        const state = newState();
        state.setSessions(sessionsFixture());
        state.setNavFilter({ projectId: 'projecta' });
        state.setNavSelection({ type: 'session', id: 'a2', index: 1 });
        state.setNavViewScroll('sessions', 1);
        state.configure({ sessionId: 'other' });
        expect(state.navFilter.projectId).toEqual('projecta');
        expect(state.navSelection?.id).toEqual('a2');
        expect(state.getNavViewScroll('sessions')).toEqual(1);
        expect(state.navFilteredSessions.map(s => s.id)).toEqual(['a1', 'a2']);
    }
}

// ── /projects handler wiring (P236 part B) ──────────────────────────────────

interface CtxRecorder {
    filter?: NavFilter;
    scroll?: { viewId: string; scroll: number };
    selection?: NavSelection;
    opened?: string;
    notified: string[];
}

function mockResolveSessionProjectKey(session?: {
    projectKey?: string;
    projectId?: string;
    workspace?: string;
    primaryThreadId?: string;
} | null): string {
    if (String(session?.projectKey || '').trim()) {
        return String(session?.projectKey).trim();
    }
    if (String(session?.projectId || '').trim()) {
        return `project:${String(session?.projectId).trim()}`;
    }
    if (String(session?.workspace || '').trim()) {
        return `workspace:${String(session?.workspace).trim()}`;
    }
    return '';
}

function buildMockCtx(
    projects: Array<{ key: string; label: string; sessionCount: number; lastActive?: number }>,
    sessions: AgentConsoleSessionItem[],
    selectQueue: Array<string | undefined>
): { ctx: CommandHandlerContext; rec: CtxRecorder } {
    const rec: CtxRecorder = { notified: [] };
    const state = {
        projects,
        sessions,
        consoleOptions: {},
        closeReview: () => undefined,
        closeGitSnapshotDetail: () => undefined,
        setNavFilter: (filter?: NavFilter) => { rec.filter = filter; },
        setNavViewScroll: (viewId: string, scroll: number) => { rec.scroll = { viewId, scroll }; },
        setNavSelection: (selection?: NavSelection) => { rec.selection = selection; }
    };
    const ctx = {
        state,
        notify: (message: string) => { rec.notified.push(message); },
        select: async (_title: string, _options: AgentConsoleSelectOption[], _selectedIndex?: number, _hint?: string): Promise<string | undefined> => selectQueue.shift(),
        refreshSessions: async () => undefined,
        resolveSessionProjectKey: mockResolveSessionProjectKey,
        openSession: async (sessionId?: string) => { rec.opened = sessionId; }
    } as unknown as CommandHandlerContext;
    return { ctx, rec };
}

@Suite('p236 /projects writes shared nav store (P236 part B)')
export class ProjectsHandlerNavWiringTest {

    @Test('/projects writes navFilter, navViewScroll and navSelection after a pick')
    async testWritesNavStore() {
        const projects = [{ key: 'k-a', label: 'A', sessionCount: 2 }];
        const sessions = sessionsFixture();
        const { ctx, rec } = buildMockCtx(projects, sessions, ['k-a', 'a2']);
        const ok = await COMMAND_HANDLERS['/projects'](ctx, '', { command: '/projects', matches: [] });
        expect(ok).toBe(true);
        expect(rec.filter).toEqual({ projectId: 'projecta' });
        expect(rec.scroll).toEqual({ viewId: 'sessions', scroll: 1 });
        expect(rec.selection).toEqual({ type: 'session', id: 'a2', index: 1 });
        expect(rec.opened).toEqual('a2');
    }

    @Test('/projects falls back to the project key when sessions carry no projectId')
    async testFallbackToProjectKey() {
        const projects = [{ key: 'k-a', label: 'A', sessionCount: 2 }];
        const sessions = sessionsFixture().map(s => ({ ...s, projectId: undefined }));
        const { ctx, rec } = buildMockCtx(projects, sessions, ['k-a', 'a2']);
        const ok = await COMMAND_HANDLERS['/projects'](ctx, '', { command: '/projects', matches: [] });
        expect(ok).toBe(true);
        expect(rec.filter).toEqual({ projectId: 'k-a' });
        expect(rec.scroll).toEqual({ viewId: 'sessions', scroll: 1 });
        expect(rec.selection).toEqual({ type: 'session', id: 'a2', index: 1 });
        expect(rec.opened).toEqual('a2');
    }

    @Test('/projects with no sessions in the picked project notifies and writes nothing')
    async testNoSessionsInProject() {
        const projects = [{ key: 'k-b', label: 'B', sessionCount: 2 }];
        const sessions = [sessionsFixture()[0]];
        const { ctx, rec } = buildMockCtx(projects, sessions, ['k-b', 'a2']);
        const ok = await COMMAND_HANDLERS['/projects'](ctx, '', { command: '/projects', matches: [] });
        expect(ok).toBe(true);
        expect(rec.notified).toEqual(['No sessions in this project.']);
        expect(rec.filter).toBeUndefined();
        expect(rec.selection).toBeUndefined();
        expect(rec.opened).toBeUndefined();
    }

    @Test('/projects cancelled pick writes nothing')
    async testCancelledPick() {
        const projects = [{ key: 'k-a', label: 'A', sessionCount: 2 }];
        const { ctx, rec } = buildMockCtx(projects, sessionsFixture(), [undefined]);
        const ok = await COMMAND_HANDLERS['/projects'](ctx, '', { command: '/projects', matches: [] });
        expect(ok).toBe(true);
        expect(rec.filter).toBeUndefined();
        expect(rec.scroll).toBeUndefined();
        expect(rec.selection).toBeUndefined();
        expect(rec.opened).toBeUndefined();
    }
}