import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    buildHarnessProjection,
    buildHarnessList,
    buildHarnessAncestors,
    formatHarnessTreeLines,
    formatHarnessListLines,
    harnessJointKey,
    shortenHarnessSessionId,
    formatHarnessDelegationLine
} from '../src/harness/harness-projection';
import type { DelegationTreeNode } from '../src/harness/DelegationGraphStore';
import type { BackgroundTaskRecord } from '../src/memory/background-task-store';

function treeNode(over: Partial<DelegationTreeNode> & { sessionId: string }): DelegationTreeNode {
    return { children: [], ...over };
}

function task(over: Partial<BackgroundTaskRecord> & { id: string; sessionId: string }): BackgroundTaskRecord {
    return {
        status: 'running',
        goal: 'test goal',
        startedAt: 1000,
        ...over
    };
}

@Suite('Harness projection')
export class HarnessProjectionTest {

    @Test('buildHarnessProjection: single root node produces one delegation')
    singleRoot() {
        const root = treeNode({ sessionId: 'root-1', status: 'active', createdAt: 100 });
        const proj = buildHarnessProjection(root);
        expect(proj.delegations.size).toEqual(1);
        const d = proj.delegations.get('root-1')!;
        expect(d.sessionId).toEqual('root-1');
        expect(d.status).toEqual('active');
        expect(d.depth).toEqual(0);
        expect(d.childCount).toEqual(0);
        expect(d.key).toEqual('session:root-1');
    }

    @Test('buildHarnessProjection: nested children with correct depth and parent')
    nestedChildren() {
        const root = treeNode({
            sessionId: 'root',
            status: 'completed',
            createdAt: 100,
            children: [
                treeNode({ sessionId: 'child-1', edgeId: 'e1', kind: 'nested', status: 'active', createdAt: 200, children: [] }),
                treeNode({ sessionId: 'child-2', edgeId: 'e2', kind: 'spawn_agent', status: 'failed', createdAt: 300, children: [] })
            ]
        });
        const proj = buildHarnessProjection(root);
        expect(proj.delegations.size).toEqual(3);

        const rootD = proj.delegations.get('root')!;
        expect(rootD.depth).toEqual(0);
        expect(rootD.childCount).toEqual(2);

        const c1 = proj.delegations.get('child-1')!;
        expect(c1.depth).toEqual(1);
        expect(c1.parentSessionId).toEqual('root');
        expect(c1.kind).toEqual('nested');
        expect(c1.status).toEqual('active');

        const c2 = proj.delegations.get('child-2')!;
        expect(c2.depth).toEqual(1);
        expect(c2.parentSessionId).toEqual('root');
        expect(c2.kind).toEqual('spawn_agent');
        expect(c2.status).toEqual('failed');
    }

    @Test('buildHarnessProjection: background task merges status and goal')
    backgroundTaskMerge() {
        const root = treeNode({ sessionId: 's1', status: 'active', createdAt: 100, metadata: { goal: 'edge-goal' } });
        const tasks: BackgroundTaskRecord[] = [
            task({ id: 't1', sessionId: 's1', status: 'running', goal: 'task-goal', progress: 0.5, startedAt: 200 })
        ];
        const proj = buildHarnessProjection(root, tasks);
        const d = proj.delegations.get('s1')!;
        expect(d.status).toEqual('running');
        expect(d.goal).toEqual('task-goal');
        expect(d.taskIds).toEqual(['t1']);

        const w = proj.activeWorkers.get('s1')!;
        expect(w.status).toEqual('running');
        expect(w.progress).toEqual(0.5);
        expect(w.goal).toEqual('task-goal');
    }

    @Test('buildHarnessProjection: planId/stepId joint key from metadata')
    planStepJointKey() {
        const root = treeNode({
            sessionId: 's1',
            status: 'active',
            createdAt: 100,
            metadata: { planId: 'plan-A', stepId: 'step-1' }
        });
        const proj = buildHarnessProjection(root);
        const d = proj.delegations.get('s1')!;
        expect(d.key).toEqual('plan:plan-A:step:step-1');
        expect(d.planId).toEqual('plan-A');
        expect(d.stepId).toEqual('step-1');

        // Aggregate should be under the joint key
        const agg = proj.taskAggregates.get('plan:plan-A:step:step-1')!;
        expect(agg.total).toEqual(1);
        expect(agg.sessionIds).toEqual(['s1']);
    }

    @Test('buildHarnessProjection: aggregates multiple sessions under same joint key')
    aggregateJointKey() {
        const root = treeNode({
            sessionId: 'root',
            status: 'completed',
            createdAt: 100,
            children: [
                treeNode({ sessionId: 'w1', status: 'completed', createdAt: 200, metadata: { planId: 'p1', stepId: 's1' }, children: [] }),
                treeNode({ sessionId: 'w2', status: 'failed', createdAt: 300, metadata: { planId: 'p1', stepId: 's1' }, children: [] }),
                treeNode({ sessionId: 'w3', status: 'active', createdAt: 400, metadata: { planId: 'p1', stepId: 's1' }, children: [] })
            ]
        });
        const proj = buildHarnessProjection(root);
        const agg = proj.taskAggregates.get('plan:p1:step:s1')!;
        expect(agg.total).toEqual(3);
        expect(agg.completed).toEqual(1);
        expect(agg.failed).toEqual(1);
        expect(agg.active).toEqual(1);
        expect(agg.sessionIds).toEqual(['w1', 'w2', 'w3']);
    }

    @Test('buildHarnessProjection: empty tree produces empty projection')
    emptyTree() {
        const root = treeNode({ sessionId: 'root', createdAt: 100 });
        const proj = buildHarnessProjection(root);
        expect(proj.delegations.size).toEqual(1);
        expect(proj.activeWorkers.size).toEqual(0);
        expect(proj.taskAggregates.size).toEqual(1); // session:root aggregate
    }

    @Test('buildHarnessList: sorted by createdAt ascending')
    listSortByCreatedAt() {
        const root = treeNode({
            sessionId: 'root',
            status: 'completed',
            createdAt: 300,
            children: [
                treeNode({ sessionId: 'c2', status: 'active', createdAt: 200, children: [] }),
                treeNode({ sessionId: 'c1', status: 'active', createdAt: 100, children: [] })
            ]
        });
        const proj = buildHarnessProjection(root);
        const list = buildHarnessList(proj);
        expect(list.length).toEqual(3);
        expect(list[0].sessionId).toEqual('c1');
        expect(list[1].sessionId).toEqual('c2');
        expect(list[2].sessionId).toEqual('root');
    }

    @Test('buildHarnessAncestors: returns lineage from child to root')
    ancestorsLineage() {
        const root = treeNode({
            sessionId: 'root',
            status: 'completed',
            createdAt: 100,
            children: [
                treeNode({
                    sessionId: 'mid',
                    status: 'active',
                    createdAt: 200,
                    children: [
                        treeNode({ sessionId: 'leaf', status: 'active', createdAt: 300, children: [] })
                    ]
                })
            ]
        });
        const proj = buildHarnessProjection(root);
        const ancestors = buildHarnessAncestors(proj, 'leaf');
        expect(ancestors.length).toEqual(2);
        expect(ancestors[0].sessionId).toEqual('mid');
        expect(ancestors[1].sessionId).toEqual('root');
    }

    @Test('buildHarnessAncestors: root returns empty')
    ancestorsRoot() {
        const root = treeNode({ sessionId: 'root', createdAt: 100 });
        const proj = buildHarnessProjection(root);
        const ancestors = buildHarnessAncestors(proj, 'root');
        expect(ancestors.length).toEqual(0);
    }

    @Test('formatHarnessTreeLines: renders tree with branch prefixes')
    formatTreeLines() {
        const root = treeNode({
            sessionId: 'root-session-id-very-long',
            status: 'active',
            createdAt: 100,
            children: [
                treeNode({ sessionId: 'child-a', edgeId: 'e1', kind: 'nested', status: 'completed', createdAt: 200, children: [] }),
                treeNode({ sessionId: 'child-b', edgeId: 'e2', kind: 'spawn_agent', status: 'active', createdAt: 300, children: [
                    treeNode({ sessionId: 'grandchild', status: 'active', createdAt: 400, children: [] })
                ] })
            ]
        });
        const lines = formatHarnessTreeLines(root);
        expect(lines.length).toEqual(4);
        // Root line
        expect(lines[0]).toContain('root-ses…');
        // Child lines with branch prefixes
        expect(lines[1]).toContain('├─');
        expect(lines[1]).toContain('child-a');
        expect(lines[1]).toContain('nested');
        expect(lines[2]).toContain('└─');
        expect(lines[2]).toContain('child-b');
        // Grandchild indented under child-b (last child connector is spaces)
        expect(lines[3]).toContain('   └─');
        expect(lines[3]).toContain('grandchild');
    }

    @Test('formatHarnessTreeLines: renders merged background task status and goal')
    formatTreeLinesFromProjection() {
        const root = treeNode({
            sessionId: 'root',
            status: 'active',
            children: [
                treeNode({ sessionId: 'worker', kind: 'spawn_agent', status: 'active', children: [] })
            ]
        });
        const projection = buildHarnessProjection(root, [
            task({ id: 'task-1', sessionId: 'worker', status: 'failed', goal: 'inspect failure' })
        ]);

        const lines = formatHarnessTreeLines(root, projection);

        expect(lines[1]).toContain('worker spawn_agent ✗');
        expect(lines[1]).toContain('inspect failure');
    }

    @Test('formatHarnessListLines: renders flat list')
    formatListLines() {
        const root = treeNode({
            sessionId: 'root',
            status: 'completed',
            createdAt: 100,
            children: [
                treeNode({ sessionId: 'w1', status: 'active', createdAt: 200, metadata: { goal: 'build feature' }, children: [] })
            ]
        });
        const tasks: BackgroundTaskRecord[] = [
            task({ id: 't1', sessionId: 'w1', status: 'running', goal: 'build feature', startedAt: 300 })
        ];
        const proj = buildHarnessProjection(root, tasks);
        const lines = formatHarnessListLines(proj);
        expect(lines.length).toBeGreaterThanOrEqual(2);
        // Should contain the goal text
        expect(lines.some(l => l.includes('build feature'))).toEqual(true);
    }

    @Test('harnessJointKey: produces correct keys')
    jointKey() {
        expect(harnessJointKey('p1', 's1', 'sess')).toEqual('plan:p1:step:s1');
        expect(harnessJointKey('p1', undefined, 'sess')).toEqual('plan:p1');
        expect(harnessJointKey(undefined, undefined, 'sess')).toEqual('session:sess');
        expect(harnessJointKey(undefined, 's1', 'sess')).toEqual('session:sess');
    }

    @Test('shortenHarnessSessionId: truncates long ids')
    shortenId() {
        expect(shortenHarnessSessionId('abc')).toEqual('abc');
        expect(shortenHarnessSessionId('abcdefghijklmnop')).toEqual('abcdefgh…');
    }
}
