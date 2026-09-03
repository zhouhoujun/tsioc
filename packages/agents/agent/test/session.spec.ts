import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { SessionStore } from '../src/memory/SessionStore';
import { runAgentOrmApp } from './helpers/agent-orm';

@Suite('Agent session store')
export class SessionStoreTest {
    private async boot() {
        const ctx = await runAgentOrmApp();
        const store = ctx.get(SessionStore);
        return { ctx, store };
    }
    @Test('stores ordered messages')
    async appendMessages() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            await store.append('session', { id: '2', role: 'assistant', content: 'hello', createdAt: 2 });
            const state = await store.get('session');
            expect(state.messages.length).toEqual(2);
            expect(state.messages[0].content).toEqual('hi');
            expect(state.messages[1].content).toEqual('hello');
        } finally { await ctx.close(); }
    }

    @Test('tracks created and updated timestamps')
    async tracksTimestamps() {
        const { ctx, store } = await this.boot();
        try {
            const empty = await store.get('session');
            expect(typeof empty.createdAt).toEqual('number');
            expect(typeof empty.updatedAt).toEqual('number');

            await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            const state = await store.get('session');
            expect(state.createdAt).toBeTruthy();
            expect(state.updatedAt).toBeTruthy();
            expect(state.updatedAt! >= state.createdAt!).toEqual(true);
        } finally { await ctx.close(); }
    }

    @Test('deletes only requested session')
    async deletesOneSession() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.append('session-2', { id: '2', role: 'user', content: 'two', createdAt: 2 });

            store.delete('session-1');

            expect((await store.get('session-1')).messages).toEqual([]);
            expect((await store.get('session-2')).messages.length).toEqual(1);
        } finally { await ctx.close(); }
    }

    @Test('stores owner metadata and lists session ids')
    async storesOwnerAndListsSessionIds() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.append('session-2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
            await store.setOwner('session-1', 'user-1');

            const state = await store.get('session-1');
            expect(state.ownerPrincipalId).toEqual('user-1');
            expect(await store.listSessionIds()).toEqual(['session-1', 'session-2']);
        } finally { await ctx.close(); }
    }

    @Test('clears owner without recreating deleted session')
    async clearsOwnerWithoutRecreatingDeletedSession() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setOwner('session-1', 'user-1');
            store.delete('session-1');

            await store.setOwner('session-1', undefined);
            expect(await store.has('session-1')).toEqual(false);
        } finally { await ctx.close(); }
    }

    @Test('stores project metadata and lists projects by project id')
    async storesProjectMetadataAndListsProjects() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setWorkspace('session-1', '/tmp/project-a');
            await store.setProjectMetadata('session-1', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-1',
                sessionRole: 'main',
                rootRequest: 'Build an exam system',
                focusSummary: 'M4 grouping'
            });

            const state = await store.get('session-1');
            expect(state.projectId).toEqual('exam-system');
            expect(state.primaryThreadId).toEqual('thread-1');
            expect(state.sessionRole).toEqual('main');
            expect(state.rootRequest).toEqual('Build an exam system');
            expect(state.focusSummary).toEqual('M4 grouping');

            const projects = await store.listProjects();
            expect(projects).toEqual([{
                projectKey: 'project:exam-system',
                projectId: 'exam-system',
                workspace: '/tmp/project-a',
                primaryThreadId: 'thread-1',
                sessionRole: 'main',
                rootRequest: 'Build an exam system',
                focusSummary: 'M4 grouping',
                sessionIds: ['session-1'],
                lastActiveAt: state.updatedAt
            }]);
        } finally { await ctx.close(); }
    }

    @Test('falls back to primary thread when grouping projects')
    async fallsBackToPrimaryThreadWhenGroupingProjects() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-thread', { id: '1', role: 'user', content: 'thread', createdAt: 1 });
            await store.setProjectMetadata('session-thread', {
                primaryThreadId: 'thread-9',
                sessionRole: 'worker'
            });

            const projects = await store.listProjects();
            expect(projects).toEqual([{
                projectKey: 'thread:thread-9',
                projectId: undefined,
                workspace: undefined,
                primaryThreadId: 'thread-9',
                sessionRole: 'worker',
                rootRequest: undefined,
                focusSummary: undefined,
                sessionIds: ['session-thread'],
                lastActiveAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('prefers primary thread over workspace when grouping projects')
    async prefersPrimaryThreadOverWorkspaceWhenGroupingProjects() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-thread', { id: '1', role: 'user', content: 'thread', createdAt: 1 });
            await store.setWorkspace('session-thread', '/tmp/project-a');
            await store.setProjectMetadata('session-thread', {
                primaryThreadId: 'thread-9',
                sessionRole: 'worker'
            });

            const projects = await store.listProjects();
            expect(projects).toEqual([{
                projectKey: 'thread:thread-9',
                projectId: undefined,
                workspace: '/tmp/project-a',
                primaryThreadId: 'thread-9',
                sessionRole: 'worker',
                rootRequest: undefined,
                focusSummary: undefined,
                sessionIds: ['session-thread'],
                lastActiveAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('listProjects prefers latest active session metadata for grouped projects')
    async listProjectsPrefersLatestActiveSessionMetadataForGroupedProjects() {
        const { ctx, store } = await this.boot();
        try {
            const originalNow = Date.now;
            let now = 100;
            Date.now = () => ++now;
            try {
                await store.append('session-a', { id: '1', role: 'user', content: 'a', createdAt: 1 });
                await store.setWorkspace('session-a', '/tmp/project-a');
                await store.setProjectMetadata('session-a', {
                    projectId: 'exam-system',
                    primaryThreadId: 'thread-a'
                });
                await store.append('session-b', { id: '2', role: 'user', content: 'b', createdAt: 2 });
                await store.setWorkspace('session-b', '/tmp/project-b');
                await store.setProjectMetadata('session-b', {
                    projectId: 'exam-system',
                    primaryThreadId: 'thread-b'
                });
            } finally {
                Date.now = originalNow;
            }

            const projects = await store.listProjects();

            expect(projects).toEqual([{
                projectKey: 'project:exam-system',
                projectId: 'exam-system',
                workspace: '/tmp/project-b',
                primaryThreadId: 'thread-b',
                sessionRole: undefined,
                rootRequest: undefined,
                focusSummary: undefined,
                sessionIds: ['session-b', 'session-a'],
                lastActiveAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('falls back from project id to workspace and session when grouping')
    async fallsBackWhenGroupingProjects() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-a', { id: '1', role: 'user', content: 'a', createdAt: 1 });
            await store.append('session-b', { id: '2', role: 'user', content: 'b', createdAt: 2 });
            await store.append('session-c', { id: '3', role: 'user', content: 'c', createdAt: 3 });
            await store.setWorkspace('session-a', '/tmp/project-a');
            await store.setWorkspace('session-b', '/tmp/project-a');

            const projects = await store.listProjects();
            expect(projects.map(project => project.projectKey).slice().sort()).toEqual(['session:session-c', 'workspace:/tmp/project-a']);
            expect(projects.find(project => project.projectKey === 'workspace:/tmp/project-a')?.sessionIds.slice().sort()).toEqual(['session-a', 'session-b']);
            expect(projects.find(project => project.projectKey === 'session:session-c')?.sessionIds).toEqual(['session-c']);
        } finally { await ctx.close(); }
    }

    @Test('normalizes Windows workspace variants into a single project bucket')
    async normalizesWindowsWorkspaceVariantsIntoSingleBucket() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-a', { id: '1', role: 'user', content: 'a', createdAt: 1 });
            await store.append('session-b', { id: '2', role: 'user', content: 'b', createdAt: 2 });
            await store.setWorkspace('session-a', 'C:\\Repo\\Agents\\');
            await store.setWorkspace('session-b', 'c:/repo/agents');

            const projects = await store.listProjects();

            expect(projects.map(project => project.projectKey)).toEqual(['workspace:c:/repo/agents']);
            expect(projects[0].sessionIds.slice().sort()).toEqual(['session-a', 'session-b']);
        } finally { await ctx.close(); }
    }

    @Test('stores origin thread id and lists threads by primary thread id')
    async storesOriginThreadIdAndListsThreads() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setWorkspace('session-1', '/tmp/project-a');
            await store.setProjectMetadata('session-1', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-1',
                originThreadId: 'root-0',
                sessionRole: 'branch',
                rootRequest: 'Build an exam system',
                focusSummary: 'M4 grouping'
            });

            const state = await store.get('session-1');
            expect(state.projectId).toEqual('exam-system');
            expect(state.primaryThreadId).toEqual('thread-1');
            expect(state.originThreadId).toEqual('root-0');
            expect(state.sessionRole).toEqual('branch');
            expect(state.rootRequest).toEqual('Build an exam system');
            expect(state.focusSummary).toEqual('M4 grouping');

            const threads = await store.listThreads();
            expect(threads).toEqual([{
                threadId: 'thread-1',
                projectId: 'exam-system',
                workspace: '/tmp/project-a',
                title: 'M4 grouping',
                rootRequest: 'Build an exam system',
                status: 'active',
                stage: 'discovery',
                originThreadId: 'root-0',
                currentSessionId: 'session-1',
                sessionIds: ['session-1'],
                createdAt: state.createdAt,
                updatedAt: state.updatedAt,
                lastActiveAt: state.updatedAt
            }]);
        } finally { await ctx.close(); }
    }

    @Test('falls back to session id when grouping threads')
    async fallsBackToSessionIdWhenGroupingThreads() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-solo', { id: '1', role: 'user', content: 'solo', createdAt: 1 });

            const threads = await store.listThreads();
            expect(threads).toEqual([{
                threadId: 'session:session-solo',
                projectId: undefined,
                workspace: undefined,
                title: undefined,
                rootRequest: undefined,
                status: 'active',
                stage: undefined,
                originThreadId: undefined,
                currentSessionId: 'session-solo',
                sessionIds: ['session-solo'],
                createdAt: expect.any(Number),
                updatedAt: expect.any(Number),
                lastActiveAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('listThreads prefers latest active session metadata and maps review role to completed')
    async listThreadsPrefersLatestActiveSessionAndMapsReviewRole() {
        const { ctx, store } = await this.boot();
        try {
            const originalNow = Date.now;
            let now = 100;
            Date.now = () => ++now;
            try {
                await store.append('session-a', { id: '1', role: 'user', content: 'a', createdAt: 1 });
                await store.setWorkspace('session-a', '/tmp/project-a');
                await store.setProjectMetadata('session-a', {
                    projectId: 'exam-system',
                    primaryThreadId: 'thread-a',
                    sessionRole: 'main',
                    focusSummary: 'M4 grouping'
                });
                await store.append('session-b', { id: '2', role: 'user', content: 'b', createdAt: 2 });
                await store.setWorkspace('session-b', '/tmp/project-a');
                await store.setProjectMetadata('session-b', {
                    projectId: 'exam-system',
                    primaryThreadId: 'thread-a',
                    originThreadId: 'thread-a',
                    sessionRole: 'review',
                    focusSummary: 'M4 review'
                });
            } finally {
                Date.now = originalNow;
            }

            const threads = await store.listThreads();
            expect(threads).toEqual([{
                threadId: 'thread-a',
                projectId: 'exam-system',
                workspace: '/tmp/project-a',
                title: 'M4 review',
                rootRequest: undefined,
                status: 'completed',
                stage: 'review',
                originThreadId: 'thread-a',
                currentSessionId: 'session-b',
                sessionIds: ['session-b', 'session-a'],
                createdAt: expect.any(Number),
                updatedAt: expect.any(Number),
                lastActiveAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('listThreads sorts threads by activity then thread id')
    async listThreadsSortsByActivityThenThreadId() {
        const { ctx, store } = await this.boot();
        try {
            const originalNow = Date.now;
            let now = 100;
            Date.now = () => ++now;
            try {
                await store.append('session-old', { id: '1', role: 'user', content: 'old', createdAt: 1 });
                await store.setProjectMetadata('session-old', { primaryThreadId: 'thread-old', sessionRole: 'worker' });
                await store.append('session-new', { id: '2', role: 'user', content: 'new', createdAt: 2 });
                await store.setProjectMetadata('session-new', { primaryThreadId: 'thread-new', sessionRole: 'worker' });
            } finally {
                Date.now = originalNow;
            }

            const threads = await store.listThreads();
            expect(threads.map(thread => thread.threadId)).toEqual(['thread-new', 'thread-old']);
        } finally { await ctx.close(); }
    }

    @Test('listThreads maps an explicit thread status onto the derived thread')
    async listThreadsMapsExplicitThreadStatus() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-worker', { id: '1', role: 'user', content: 'work', createdAt: 1 });
            await store.setProjectMetadata('session-worker', {
                projectId: 'proj-a',
                primaryThreadId: 'thread-w',
                sessionRole: 'worker',
                threadStatus: 'blocked',
                focusSummary: 'worker focus'
            });

            const threads = await store.listThreads();
            expect(threads).toEqual([{
                threadId: 'thread-w',
                projectId: 'proj-a',
                workspace: undefined,
                title: 'worker focus',
                rootRequest: undefined,
                status: 'blocked',
                stage: 'implementation',
                originThreadId: undefined,
                currentSessionId: 'session-worker',
                sessionIds: ['session-worker'],
                createdAt: expect.any(Number),
                updatedAt: expect.any(Number),
                lastActiveAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('listThreads falls back to role-derived status when no thread status is set')
    async listThreadsFallsBackToRoleDerivedStatus() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session-main', { id: '1', role: 'user', content: 'root', createdAt: 1 });
            await store.setProjectMetadata('session-main', {
                primaryThreadId: 'thread-m',
                sessionRole: 'main'
            });

            const threads = await store.listThreads();
            expect(threads[0].status).toEqual('active');
            expect(threads[0].stage).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('stores title and pinned flags')
    async storesTitleAndPinned() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            await store.setTitle('session', 'My session');
            await store.setPinned('session', true);

            const state = await store.get('session');
            expect(state.title).toEqual('My session');
            expect(state.pinned).toEqual(true);
        } finally { await ctx.close(); }
    }

    @Test('clears title with blank input and unpins')
    async clearsTitleWithBlankInputAndUnpins() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            await store.setTitle('session', 'My session');
            await store.setPinned('session', true);

            await store.setTitle('session', '   ');
            await store.setPinned('session', false);

            const state = await store.get('session');
            expect(state.title).toBeUndefined();
            expect(state.pinned).toEqual(false);
        } finally { await ctx.close(); }
    }

    @Test('stores and clears the archived flag')
    async storesAndClearsArchived() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            await store.setArchived('session', true);

            let state = await store.get('session');
            expect(state.archived).toEqual(true);

            await store.setArchived('session', false);
            state = await store.get('session');
            expect(state.archived).toEqual(false);
        } finally { await ctx.close(); }
    }

    @Test('archived flag survives fork lineage')
    async archivedFlagSurvivesForkLineage() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('source', { id: 'u1', role: 'user', content: 'one', createdAt: 1 });
            await store.setArchived('source', true);

            const fork = await store.fork('source', undefined, 'branch-1');
            expect(fork.archived).toEqual(false);

            const state = await store.get('source');
            expect(state.archived).toEqual(true);
        } finally { await ctx.close(); }
    }

    @Test('creates and lists snapshots with labels and message counts')
    async createsAndListsSnapshots() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.append('session', { id: '2', role: 'assistant', content: 'two', createdAt: 2 });
            await store.setSummary('session', 'summary');

            const snapshotId = await store.snapshot('session', 'checkpoint');

            expect(snapshotId).toMatch(/^snap_/);
            const snapshots = await store.listSnapshots('session');
            expect(snapshots).toEqual([{
                snapshotId,
                label: 'checkpoint',
                messageCount: 2,
                summary: 'summary',
                createdAt: expect.any(Number)
            }]);
        } finally { await ctx.close(); }
    }

    @Test('restores messages and summary from a snapshot')
    async restoresMessagesAndSummaryFromSnapshot() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.append('session', { id: '2', role: 'assistant', content: 'two', createdAt: 2 });
            await store.setSummary('session', 'summary');
            const snapshotId = await store.snapshot('session', 'checkpoint');

            await store.append('session', { id: '3', role: 'user', content: 'three', createdAt: 3 });
            await store.setSummary('session', 'changed');

            await store.restoreSnapshot('session', snapshotId);

            const state = await store.get('session');
            expect(state.messages.length).toEqual(2);
            expect(state.messages.map(message => message.content)).toEqual(['one', 'two']);
            expect(state.summary).toEqual('summary');
        } finally { await ctx.close(); }
    }

    @Test('lists snapshots newest first')
    async listsSnapshotsNewestFirst() {
        const { ctx, store } = await this.boot();
        try {
            const originalNow = Date.now;
            let now = 100;
            Date.now = () => ++now;
            try {
                await store.append('session', { id: '1', role: 'user', content: 'one', createdAt: 1 });
                const first = await store.snapshot('session', 'first');
                const second = await store.snapshot('session', 'second');

                const snapshots = await store.listSnapshots('session');
                expect(snapshots.map(snapshot => snapshot.snapshotId)).toEqual([second, first]);
            } finally {
                Date.now = originalNow;
            }
        } finally { await ctx.close(); }
    }

    @Test('throws when restoring an unknown snapshot')
    async restoreThrowsForUnknownSnapshot() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await expect(store.restoreSnapshot('session', 'missing')).rejects.toThrow('snapshot not found: missing');
        } finally { await ctx.close(); }
    }

    @Test('deletes a snapshot and removes snapshots on session delete')
    async deletesSnapshotAndRemovesSnapshotsOnSessionDelete() {
        const { ctx, store } = await this.boot();
        try {
            await store.append('session', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            const snapshotId = await store.snapshot('session');

            await store.deleteSnapshot('session', snapshotId);
            expect(await store.listSnapshots('session')).toEqual([]);

            await store.snapshot('session');
            store.delete('session');
            expect(await store.listSnapshots('session')).toEqual([]);
        } finally { await ctx.close(); }
    }
}
