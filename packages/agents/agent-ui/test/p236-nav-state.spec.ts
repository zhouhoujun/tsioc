import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { AgentSessionProjectIndex, AgentThreadIndex, NavSessionSource, buildNavTree } from '@tsdi/agent';

function navFixture(): ReturnType<typeof buildNavTree> {
    const projects: AgentSessionProjectIndex[] = [
        {
            projectKey: 'k-a',
            projectId: 'projecta',
            workspace: '/w1',
            primaryThreadId: 'thread-a',
            sessionRole: 'main',
            sessionIds: ['a1', 'a2'],
            lastActiveAt: 30
        },
        {
            projectKey: 'k-b',
            projectId: 'projectb',
            workspace: '/w2',
            primaryThreadId: 'thread-b',
            sessionRole: 'main',
            sessionIds: ['b1'],
            lastActiveAt: 20
        }
    ];
    const threads: AgentThreadIndex[] = [
        {
            threadId: 'thread-a',
            projectId: 'projecta',
            workspace: '/w1',
            status: 'active',
            sessionIds: ['a1', 'a2'],
            lastActiveAt: 30
        },
        {
            threadId: 'thread-b',
            projectId: 'projectb',
            workspace: '/w2',
            status: 'completed',
            sessionIds: ['b1'],
            lastActiveAt: 20
        }
    ];
    const sessions: NavSessionSource[] = [
        {
            id: 'a1',
            workspace: '/w1',
            projectId: 'projecta',
            primaryThreadId: 'thread-a',
            sessionRole: 'main',
            status: 'active',
            title: 'A-ONE',
            summary: 'a1 summary',
            messageCount: 3,
            pinned: true,
            lastActiveAt: 30,
            createdAt: 10
        },
        {
            id: 'a2',
            workspace: '/w1',
            projectId: 'projecta',
            primaryThreadId: 'thread-a',
            sessionRole: 'main',
            status: 'active',
            title: 'A-TWO',
            summary: 'a2 summary',
            messageCount: 5,
            pinned: false,
            lastActiveAt: 25,
            createdAt: 11
        },
        {
            id: 'b1',
            workspace: '/w2',
            projectId: 'projectb',
            primaryThreadId: 'thread-b',
            sessionRole: 'worker',
            status: 'completed',
            title: 'B-ONE',
            summary: 'b1 summary',
            messageCount: 2,
            pinned: false,
            lastActiveAt: 20,
            createdAt: 12
        }
    ];
    return buildNavTree(projects, threads, sessions, 1000);
}

@Suite('nav state seeding (P236)')
export class NavStateSeedTest {

    @Test('seedNavTree stores the tree and counts sessions')
    testSeeds() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        state.seedNavTree(navFixture());
        expect(state.navTree).not.toBeNull();
        expect(state.navSeedCount).toEqual(3);
        expect(state.navTree?.totalProjects).toEqual(2);
        expect(state.navTree?.totalThreads).toEqual(2);
    }

    @Test('seedNavTree ignores invalid payloads')
    testSeedInvalid() {
        const state = new AgentConsoleSessionState();
        state.seedNavTree(null);
        expect(state.navTree).toBeNull();
        expect(state.navSeedCount).toEqual(0);
        state.seedNavTree(undefined);
        expect(state.navTree).toBeNull();
        state.seedNavTree({} as any);
        expect(state.navTree).toBeNull();
    }

    @Test('setNavFilter drops a selection that no longer resolves under the filter')
    testFilterDropsStaleSelection() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        state.seedNavTree(navFixture());
        state.setNavSelection({ type: 'session', id: 'a1', index: 0 });
        state.setNavFilter({ projectId: 'projectb' });
        expect(state.navFilter.projectId).toEqual('projectb');
        expect(state.navSelection).toBeUndefined();
    }

    @Test('setNavFilter keeps a selection that still resolves under the filter')
    testFilterKeepsSurvivingSelection() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        state.seedNavTree(navFixture());
        state.setNavSelection({ type: 'session', id: 'b1', index: 0 });
        state.setNavFilter({ projectId: 'projectb' });
        expect(state.navSelection?.id).toEqual('b1');
        expect(state.navSelection?.type).toEqual('session');
    }

    @Test('navigateNav moves the cursor over the flattened session list and stops at bounds')
    testNavigate() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        state.seedNavTree(navFixture());
        const first = state.navigateNav('down', 'session');
        expect(first?.id).toEqual('a1');
        expect(state.navSelection?.id).toEqual('a1');
        const second = state.navigateNav('down', 'session');
        expect(second?.id).toEqual('a2');
        const third = state.navigateNav('down', 'session');
        expect(third?.id).toEqual('b1');
        const atEnd = state.navigateNav('down', 'session');
        expect(atEnd).toBeUndefined();
        expect(state.navSelection?.id).toEqual('b1');
        const prev = state.navigateNav('up', 'session');
        expect(prev?.id).toEqual('a2');
    }

    @Test('nav filter, selection and per-view scroll survive configure (shared store)')
    testStateSurvivesConfigure() {
        const state = new AgentConsoleSessionState();
        state.configure({ sessionId: 's1' });
        state.seedNavTree(navFixture());
        state.setNavSelection({ type: 'session', id: 'b1', index: 2 });
        state.setNavFilter({ projectId: 'projectb' });
        state.setNavViewScroll('projects', 42);
        state.configure({ sessionId: 'other' });
        expect(state.navFilter.projectId).toEqual('projectb');
        expect(state.navSelection?.id).toEqual('b1');
        expect(state.getNavViewScroll('projects')).toEqual(42);
    }

    @Test('per-view scroll positions restore independently and clamp invalid values')
    testViewScroll() {
        const state = new AgentConsoleSessionState();
        state.setNavViewScroll('projects', 42);
        expect(state.getNavViewScroll('projects')).toEqual(42);
        expect(state.getNavViewScroll('sessions')).toEqual(0);
        state.setNavViewScroll(' projects ', 7);
        expect(state.getNavViewScroll('projects')).toEqual(7);
        state.setNavViewScroll('', 99);
        expect(state.getNavViewScroll('projects')).toEqual(7);
        state.setNavViewScroll('tasks', -5);
        expect(state.getNavViewScroll('tasks')).toEqual(0);
        state.setNavViewScroll('tasks', 3.9);
        expect(state.getNavViewScroll('tasks')).toEqual(3);
    }
}