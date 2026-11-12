import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';
import { SessionStore } from '../src/memory/SessionStore';

async function createStore(): Promise<{ store: SessionStore; close(): Promise<void> }> {
    const ctx = await Application.run(AgentModule, {
        providers: provideAgentOrm({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: [] as any
        } as any)
    });
    return { store: ctx.get(SessionStore), close: () => ctx.close() };
}

@Suite('session transcript paging')
export class SessionMessagePagingTest {

    @Test('the TypeORM store reads only the requested page')
    async typeOrmPagesWithoutLoadingTheWholeTranscript() {
        const { store, close } = await createStore();
        try {
            for (let index = 0; index < 10; index++) {
                await store.append('s1', {
                    id: `m${index}`,
                    role: 'assistant',
                    content: `msg-${index}`,
                    createdAt: index
                } as any);
            }
            await store.append('s2', { id: 'other', role: 'assistant', content: 'other', createdAt: 1 } as any);

            const tail = await store.listMessagesPage('s1', { limit: 3 });
            expect(tail.messages.map(message => message.id)).toEqual(['m7', 'm8', 'm9']);
            expect(tail.hasMore).toEqual(true);
            expect(tail.messages.length).toEqual(3);

            const before = await store.listMessagesPage('s1', { cursor: 'm9', before: true, limit: 4 });
            expect(before.messages.map(message => message.id)).toEqual(['m5', 'm6', 'm7', 'm8']);
            expect(before.hasMore).toEqual(true);

            const after = await store.listMessagesPage('s1', { cursor: 'm3', limit: 10 });
            expect(after.messages.map(message => message.id)).toEqual(['m4', 'm5', 'm6', 'm7', 'm8', 'm9']);
            expect(after.hasMore).toEqual(false);

            let invalid = '';
            await store.listMessagesPage('s1', { cursor: 'nope' }, cursor => {
                invalid = cursor;
                return new Error('invalid cursor');
            }).then(() => undefined, error => {
                expect((error as Error).message).toEqual('invalid cursor');
            });
            expect(invalid).toEqual('nope');
        } finally {
            await close();
        }
    }

    @Test('the default store implementation keeps the same paging contract')
    async defaultStorePagesTheLoadedTranscript() {
        const base = new (class extends SessionStore {
            constructor(private states: Record<string, any>) { super(); }
            get(sessionId: string): any { return Promise.resolve(this.states[sessionId] || { messages: [] }); }
            has(): any { return Promise.resolve(true); }
            listSessionIds(): any { return Promise.resolve(Object.keys(this.states)); }
            listProjects(): any { return Promise.resolve([]); }
            listThreads(): any { return Promise.resolve([]); }
            listSections(): any { return Promise.resolve([]); }
            addSection(): any { return Promise.resolve({}); }
            renameSection(): any { return Promise.resolve(); }
            moveSection(): any { return Promise.resolve(); }
            deleteSection(): any { return Promise.resolve(); }
            appendRaw(): any { return Promise.resolve({}); }
            setSummary(): any { return Promise.resolve(); }
            setTitle(): any { return Promise.resolve(); }
            setPinned(): any { return Promise.resolve(); }
            setArchived(): any { return Promise.resolve(); }
            snapshot(): any { return Promise.resolve(''); }
            listSnapshots(): any { return Promise.resolve([]); }
            restoreSnapshot(): any { return Promise.resolve(); }
            deleteSnapshot(): any { return Promise.resolve(); }
            setOwner(): any { return Promise.resolve(); }
            setWorkspace(): any { return Promise.resolve(); }
            setProjectMetadata(): any { return Promise.resolve(); }
            delete(): any { return Promise.resolve(); }
            clear(): any { return Promise.resolve(); }
        })({
            a: {
                messages: [0, 1, 2, 3].map(index => ({
                    id: `m${index}`,
                    role: 'assistant',
                    content: `msg-${index}`,
                    createdAt: index
                }))
            }
        });

        const tail = await (base as SessionStore).listMessagesPage('a', { limit: 2 });
        expect(tail.messages.map(message => message.id)).toEqual(['m2', 'm3']);
        expect(tail.hasMore).toEqual(true);

        const older = await (base as SessionStore).listMessagesPage('a', { cursor: 'm2', before: true, limit: 2 });
        expect(older.messages.map(message => message.id)).toEqual(['m0', 'm1']);
        expect(older.hasMore).toEqual(false);
    }
}
