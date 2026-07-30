import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';

@Suite('Agent session store')
export class SessionStoreTest {
    @Test('stores ordered messages')
    async appendMessages() {
        const store = new InMemorySessionStore();
        await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
        await store.append('session', { id: '2', role: 'assistant', content: 'hello', createdAt: 2 });
        const state = await store.get('session');
        expect(state.messages.length).toEqual(2);
        expect(state.messages[0].content).toEqual('hi');
        expect(state.messages[1].content).toEqual('hello');
    }

    @Test('tracks created and updated timestamps')
    async tracksTimestamps() {
        const store = new InMemorySessionStore();
        const empty = await store.get('session');
        expect(typeof empty.createdAt).toEqual('number');
        expect(typeof empty.updatedAt).toEqual('number');

        await store.append('session', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
        const state = await store.get('session');
        expect(state.createdAt).toBeTruthy();
        expect(state.updatedAt).toBeTruthy();
        expect(state.updatedAt! >= state.createdAt!).toEqual(true);
    }

    @Test('deletes only requested session')
    async deletesOneSession() {
        const store = new InMemorySessionStore();
        await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.append('session-2', { id: '2', role: 'user', content: 'two', createdAt: 2 });

        store.delete('session-1');

        expect((await store.get('session-1')).messages).toEqual([]);
        expect((await store.get('session-2')).messages.length).toEqual(1);
    }

    @Test('stores owner metadata and lists session ids')
    async storesOwnerAndListsSessionIds() {
        const store = new InMemorySessionStore();
        await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.append('session-2', { id: '2', role: 'user', content: 'two', createdAt: 2 });
        await store.setOwner('session-1', 'user-1');

        const state = await store.get('session-1');
        expect(state.ownerPrincipalId).toEqual('user-1');
        expect(await store.listSessionIds()).toEqual(['session-1', 'session-2']);
    }

    @Test('clears owner without recreating deleted session')
    async clearsOwnerWithoutRecreatingDeletedSession() {
        const store = new InMemorySessionStore();
        await store.append('session-1', { id: '1', role: 'user', content: 'one', createdAt: 1 });
        await store.setOwner('session-1', 'user-1');
        store.delete('session-1');

        await store.setOwner('session-1', undefined);
        expect(await store.has('session-1')).toEqual(false);
    }

    @Test('stores project metadata and lists projects by project id')
    async storesProjectMetadataAndListsProjects() {
        const store = new InMemorySessionStore();
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
            sessionIds: ['session-1'],
            lastActiveAt: state.updatedAt
        }]);
    }

    @Test('falls back to primary thread when grouping projects')
    async fallsBackToPrimaryThreadWhenGroupingProjects() {
        const store = new InMemorySessionStore();
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
            sessionIds: ['session-thread'],
            lastActiveAt: expect.any(Number)
        }]);
    }

    @Test('falls back from project id to workspace and session when grouping')
    async fallsBackWhenGroupingProjects() {
        const store = new InMemorySessionStore();
        await store.append('session-a', { id: '1', role: 'user', content: 'a', createdAt: 1 });
        await store.append('session-b', { id: '2', role: 'user', content: 'b', createdAt: 2 });
        await store.append('session-c', { id: '3', role: 'user', content: 'c', createdAt: 3 });
        await store.setWorkspace('session-a', '/tmp/project-a');
        await store.setWorkspace('session-b', '/tmp/project-a');

        const projects = await store.listProjects();
        expect(projects.map(project => project.projectKey)).toEqual(['session:session-c', 'workspace:/tmp/project-a']);
        expect(projects.find(project => project.projectKey === 'workspace:/tmp/project-a')?.sessionIds.sort()).toEqual(['session-a', 'session-b']);
        expect(projects.find(project => project.projectKey === 'session:session-c')?.sessionIds).toEqual(['session-c']);
    }
}
