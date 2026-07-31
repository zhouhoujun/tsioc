import expect = require('expect');
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AgentOrmModule } from '../src/orm.module';
import { TypeOrmSessionStore } from '../src/memory/TypeOrmSessionStore';

@Module({
    imports: [
        AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    ],
    providers: [
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() },
        TypeOrmSessionStore
    ]
})
class PersistentSessionTestModule {
}

describe('Persistent session store', () => {
    it('persists ordered messages and summary', async () => {
        const ctx = await Application.run(PersistentSessionTestModule);
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('session-1', { id: '1', role: 'user', content: 'hi', createdAt: 1 });
            await store.append('session-1', { id: '2', role: 'assistant', content: 'hello', createdAt: 2, metadata: { model: 'm1' } });
            await store.setSummary('session-1', 'summary');
            const state = await store.get('session-1');
            expect(state.sessionId).toEqual('session-1');
            expect(state.summary).toEqual('summary');
            expect(state.messages.length).toEqual(2);
            expect(state.messages[0].content).toEqual('hi');
            expect(state.messages[1].content).toEqual('hello');
            expect(state.messages[1].metadata?.model).toEqual('m1');
        } finally {
            await ctx.close();
        }
    });

    it('reloads persisted transcript from the same store', async () => {
        const ctx = await Application.run(PersistentSessionTestModule);
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('session-2', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.append('session-2', { id: '2', role: 'tool', content: '{"ok":true}', name: 'echo', toolCallId: 'tool-1', createdAt: 2 });
            const first = await store.get('session-2');
            const second = await store.get('session-2');
            expect(first.messages.length).toEqual(2);
            expect(second.messages.length).toEqual(2);
            expect(second.messages[1].role).toEqual('tool');
            expect(second.messages[1].toolCallId).toEqual('tool-1');
        } finally {
            await ctx.close();
        }
    });

    it('persists owner metadata and session id listing', async () => {
        const ctx = await Application.run(PersistentSessionTestModule);
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('session-3', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setOwner('session-3', 'user-3');
            const state = await store.get('session-3');
            expect(state.ownerPrincipalId).toEqual('user-3');
            expect(await store.listSessionIds()).toContain('session-3');
        } finally {
            await ctx.close();
        }
    });

    it('clears owner without recreating deleted session', async () => {
        const ctx = await Application.run(PersistentSessionTestModule);
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('session-4', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setOwner('session-4', 'user-4');
            await store.delete('session-4');
            await store.setOwner('session-4', undefined);
            expect(await store.has('session-4')).toEqual(false);
        } finally {
            await ctx.close();
        }
    });

    it('persists project metadata and project indexes', async () => {
        const ctx = await Application.run(PersistentSessionTestModule);
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('session-5', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setWorkspace('session-5', '/tmp/project-a');
            await store.setProjectMetadata('session-5', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-5',
                sessionRole: 'main',
                rootRequest: 'Build an exam system',
                focusSummary: 'Group related sessions'
            });

            const state = await store.get('session-5');
            expect(state.projectId).toEqual('exam-system');
            expect(state.primaryThreadId).toEqual('thread-5');
            expect(state.sessionRole).toEqual('main');
            expect(state.rootRequest).toEqual('Build an exam system');
            expect(state.focusSummary).toEqual('Group related sessions');

            const projects = await store.listProjects();
            expect(projects).toContainEqual(expect.objectContaining({
                projectKey: 'project:exam-system',
                projectId: 'exam-system',
                workspace: '/tmp/project-a',
                sessionRole: 'main',
                rootRequest: 'Build an exam system',
                focusSummary: 'Group related sessions',
                sessionIds: ['session-5']
            }));
        } finally {
            await ctx.close();
        }
    });

    it('listProjects prefers latest active session metadata for grouped projects', async () => {
        const ctx = await Application.run(PersistentSessionTestModule);
        const originalNow = Date.now;
        let now = 100;
        Date.now = () => ++now;
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('session-a', { id: '1', role: 'user', content: 'one', createdAt: 1 });
            await store.setWorkspace('session-a', '/tmp/project-a');
            await store.setProjectMetadata('session-a', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-a'
            });
            await store.append('session-b', { id: '2', role: 'user', content: 'two', createdAt: 2 });
            await store.setWorkspace('session-b', '/tmp/project-b');
            await store.setProjectMetadata('session-b', {
                projectId: 'exam-system',
                primaryThreadId: 'thread-b'
            });

            const projects = await store.listProjects();
            expect(projects).toContainEqual(expect.objectContaining({
                projectKey: 'project:exam-system',
                projectId: 'exam-system',
                workspace: '/tmp/project-b',
                primaryThreadId: 'thread-b',
                sessionRole: undefined,
                rootRequest: undefined,
                focusSummary: undefined,
                sessionIds: ['session-a', 'session-b']
            }));
        } finally {
            Date.now = originalNow;
            await ctx.close();
        }
    });
});
