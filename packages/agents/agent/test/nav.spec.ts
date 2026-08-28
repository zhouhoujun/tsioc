import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    applyNavFilter,
    buildNavTree,
    flattenNav,
    navigateCursor,
    resolveNavSelection,
    NavFilter,
    NavSelection,
    NavSessionSource,
    NavTree
} from '../src/memory/nav';
import { AgentSessionProjectIndex, AgentThreadIndex } from '../src/memory/SessionStore';

function project(partial: Partial<AgentSessionProjectIndex> = {}): AgentSessionProjectIndex {
    return {
        projectKey: 'project:alpha',
        sessionIds: ['s1', 's2'],
        lastActiveAt: 10,
        ...partial
    };
}

function thread(partial: Partial<AgentThreadIndex> = {}): AgentThreadIndex {
    return {
        threadId: 't1',
        status: 'active',
        sessionIds: ['s1'],
        createdAt: 0,
        updatedAt: 0,
        lastActiveAt: 10,
        ...partial
    };
}

function session(partial: Partial<NavSessionSource> = {}): NavSessionSource {
    return {
        id: 's1',
        title: 'Session one',
        workspace: '/w1',
        lastActiveAt: 10,
        createdAt: 0,
        ...partial
    };
}

@Suite('Nav projection (P236)')
export class NavProjectionTest {
    @Test('buildNavTree folds indexes + sources into shared project/thread/session orderings')
    async foldsIndexesAndSources() {
        const tree = buildNavTree(
            [project()],
            [thread()],
            [session(), session({ id: 's2', title: 'Session two', lastActiveAt: 20 })],
            123
        );
        expect(tree.updatedAt).toBe(123);
        expect(tree.totalSessions).toBe(2);
        expect(tree.totalProjects).toBe(1);
        expect(tree.totalThreads).toBe(1);

        // project container owns both sessions
        expect(tree.projects).toHaveLength(1);
        const projectNode = tree.projects[0];
        expect(projectNode.id).toBe('project:alpha');
        expect(projectNode.type).toBe('project');
        expect(projectNode.count).toBe(2);
        expect(projectNode.children.map(child => child.id)).toEqual(['s1', 's2']);

        // thread container owns s1 only
        expect(tree.threads).toHaveLength(1);
        expect(tree.threads[0].count).toBe(1);
        expect(tree.threads[0].children[0].id).toBe('s1');

        // flat sessions sorted by lastActiveAt desc
        expect(tree.sessions.map(node => node.id)).toEqual(['s2', 's1']);
        expect(tree.sessions[0].type).toBe('session');
        expect(tree.sessions[0].count).toBe(1);

        // shared leaf identity: same object across orderings so a selection cursor is stable
        const flatSession1 = tree.sessions[1];
        const projectChild = projectNode.children.find(child => child.id === 's1')!;
        const threadChild = tree.threads[0].children[0];
        expect(flatSession1).toBe(projectChild);
        expect(projectChild).toBe(threadChild);
    }

    @Test('buildNavTree skips index-referenced sessions missing from sources and surfaces orphan sessions')
    async skipsMissingAndSurfacesOrphans() {
        // 'ghost' referenced by indexes but absent from sources → skipped
        const tree = buildNavTree(
            [project({ sessionIds: ['ghost'] })],
            [thread({ sessionIds: ['ghost'] })],
            [session({ id: 'orphan', title: 'Orphan', lastActiveAt: 5 })]
        );
        // orphan (index-less) session still surfaced in the flat ordering
        expect(tree.totalSessions).toBe(1);
        expect(tree.sessions.map(node => node.id)).toEqual(['orphan']);
        // containers keep their label but lose the ghost child
        expect(tree.totalProjects).toBe(1);
        expect(tree.projects[0].count).toBe(0);
        expect(tree.projects[0].children).toHaveLength(0);
        expect(tree.totalThreads).toBe(1);
        expect(tree.threads[0].count).toBe(0);
        // a container with empty children AND generic 'project' label is pruned
        const genericOnly = buildNavTree(
            [project({ projectKey: '', sessionIds: ['ghost'] })],
            [],
            [session({ id: 'orphan', title: 'Orphan', lastActiveAt: 5 })]
        );
        expect(genericOnly.totalProjects).toBe(0);
    }

    @Test('buildNavTree derives project status/stage from sessionRole and skips empty generic projects')
    async derivesProjectStageFromRole() {
        const tree = buildNavTree(
            [project({ sessionIds: ['s1'], sessionRole: 'review' })],
            [],
            [session({ id: 's1' })]
        );
        expect(tree.projects[0].status).toBe('completed');
        expect(tree.projects[0].stage).toBe('review');
        // worker implies implementation stage
        const tree2 = buildNavTree(
            [project({ sessionIds: ['s1'], sessionRole: 'worker' })],
            [],
            [session({ id: 's1' })]
        );
        expect(tree2.projects[0].stage).toBe('implementation');
    }

    @Test('applyNavFilter narrows all three orderings, prunes empty containers, recomputes counts, reuses leaf nodes')
    async handlesFilteringAcrossOrderings() {
        const tree = buildNavTree(
            [project()],
            [thread()],
            [session(), session({ id: 's2', title: 'Session two', lastActiveAt: 20 })]
        );
        const filter: NavFilter = { text: 'two' };
        const filtered = applyNavFilter(tree, filter);
        expect(filtered.totalSessions).toBe(1);
        expect(filtered.sessions.map(node => node.id)).toEqual(['s2']);
        // project container keeps only matching child, count recomputed
        expect(filtered.projects).toHaveLength(1);
        expect(filtered.projects[0].count).toBe(1);
        expect(filtered.projects[0].children[0].id).toBe('s2');
        // thread container pruned (its only child s1 filtered out)
        expect(filtered.threads).toHaveLength(0);
        // leaf node reused by reference (stable ids)
        expect(filtered.sessions[0]).toBe(tree.sessions[0]);

        // empty filter returns original tree object
        expect(applyNavFilter(tree, undefined)).toBe(tree);
        expect(applyNavFilter(tree, {})).toBe(tree);
    }

    @Test('applyNavFilter supports pinnedOnly/projectId/threadId/status/workspace')
    async handlesStructuredFilters() {
        const tree = buildNavTree(
            [project()],
            [thread()],
            [
                session({ id: 's1', pinned: true }),
                session({ id: 's2', projectId: 'project:alpha', primaryThreadId: 't1', workspace: '/w2', status: 'blocked' })
            ]
        );
        expect(applyNavFilter(tree, { pinnedOnly: true }).sessions.map(node => node.id)).toEqual(['s1']);
        // projectId matches sessions that carry the project id (s2 only)
        expect(applyNavFilter(tree, { projectId: 'project:alpha' }).sessions.map(node => node.id)).toEqual(['s2']);
        // threadId matches the thread container's children and sessions with primaryThreadId
        expect(applyNavFilter(tree, { threadId: 't1' }).sessions.map(node => node.id)).toEqual(['s1', 's2']);
        expect(applyNavFilter(tree, { status: 'blocked' }).sessions.map(node => node.id)).toEqual(['s2']);
        expect(applyNavFilter(tree, { workspace: '/w2' }).sessions.map(node => node.id)).toEqual(['s2']);
    }

    @Test('flattenNav returns type-restricted lists or nested project->thread->session order with dedupe')
    async flattensPerType() {
        const tree = buildNavTree(
            [project()],
            [thread({ sessionIds: ['s1'] })],
            [session(), session({ id: 's2', lastActiveAt: 20 })]
        );
        expect(flattenNav(tree, 'project').map(node => node.id)).toEqual(['project:alpha']);
        expect(flattenNav(tree, 'thread').map(node => node.id)).toEqual(['t1']);
        expect(flattenNav(tree, 'session').map(node => node.id)).toEqual(['s2', 's1']);
        // nested order: project -> its children (s1,s2), then thread t1 skipped because s1 already seen, s2 already seen
        const nested = flattenNav(tree);
        const nestedIds = nested.map(node => node.id);
        expect(nested[0].id).toBe('project:alpha');
        expect(nestedIds).toEqual(['project:alpha', 's1', 's2', 't1']);
    }

    @Test('navigateCursor moves over the flattened list and respects type restriction and bounds')
    async navigatesCursor() {
        const tree = buildNavTree(
            [project()],
            [thread({ sessionIds: ['s1'] })],
            [session(), session({ id: 's2', lastActiveAt: 20 })]
        );
        const down0 = navigateCursor(undefined, tree, 'down', 'session');
        expect(down0).toEqual({ type: 'session', id: 's2', index: 0 });
        const down1 = navigateCursor(down0, tree, 'down', 'session');
        expect(down1).toEqual({ type: 'session', id: 's1', index: 1 });
        // at bound → undefined
        expect(navigateCursor(down1, tree, 'down', 'session')).toBeUndefined();
        // up from bottom wraps to end-of-list when starting unknown
        const up = navigateCursor(undefined, tree, 'up', 'session');
        expect(up).toEqual({ type: 'session', id: 's1', index: 1 });
        // type-restricted project navigation
        const projectCursor = navigateCursor(undefined, tree, 'down', 'project');
        expect(projectCursor).toEqual({ type: 'project', id: 'project:alpha', index: 0 });
        // empty tree returns undefined
        const empty = buildNavTree([], [], []);
        expect(navigateCursor(undefined, empty, 'down', 'session')).toBeUndefined();
    }

    @Test('resolveNavSelection survives refreshes and returns undefined when the node is gone')
    async resolvesSelections() {
        let tree: NavTree = buildNavTree(
            [project()],
            [thread()],
            [session(), session({ id: 's2', title: 'Session two', lastActiveAt: 20 })]
        );
        const selection: NavSelection = { type: 'session', id: 's1', index: 1 };
        const resolved = resolveNavSelection(selection, tree);
        expect(resolved?.id).toBe('s1');
        // project selection resolves by id
        const projectSelection: NavSelection = { type: 'project', id: 'project:alpha', index: 0 };
        expect(resolveNavSelection(projectSelection, tree)?.id).toBe('project:alpha');
        // missing id → undefined (caller falls back to default index)
        const missing: NavSelection = { type: 'session', id: 'gone', index: 0 };
        expect(resolveNavSelection(missing, tree)).toBeUndefined();
        expect(resolveNavSelection(undefined, tree)).toBeUndefined();
        // after filter removes the node, resolution returns undefined
        const filtered = applyNavFilter(tree, { text: 'two' });
        expect(resolveNavSelection(selection, filtered)).toBeUndefined();
    }
}