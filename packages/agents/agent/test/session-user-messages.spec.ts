import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';
import { SessionStore } from '../src/memory/SessionStore';

async function store(): Promise<{ store: SessionStore; close(): Promise<void> }> {
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

@Suite('session store user-message reads')
export class SessionUserMessagesTest {

    @Test('listUserMessages returns only the requested sessions\' user prompts')
    async onlyUserPromptsOfGivenSessions() {
        const { store: sessionStore, close } = await store();
        try {
            await sessionStore.append('s1', { id: 'm1', role: 'user', content: 'first prompt', createdAt: 1 } as any);
            await sessionStore.append('s1', { id: 'm2', role: 'assistant', content: 'answer', createdAt: 2 } as any);
            await sessionStore.append('s1', { id: 'm3', role: 'user', content: '/hidden-command', createdAt: 3 } as any);
            await sessionStore.append('s2', { id: 'm4', role: 'user', content: 'other session', createdAt: 4 } as any);

            const messages = await sessionStore.listUserMessages(['s1']);
            expect(messages.map(message => message.content)).toEqual(['/hidden-command', 'first prompt']);
            expect(messages.every(message => typeof message.createdAt === 'number')).toBe(true);

            const both = await sessionStore.listUserMessages(['s1', 's2']);
            expect(both.map(message => message.content)).toContain('other session');
            expect((await sessionStore.listUserMessages([])).length).toEqual(0);
        } finally {
            await close();
        }
    }

    @Test('the default store implementation keeps the same contract')
    async defaultImplementation() {
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
            a: { messages: [{ role: 'user', content: 'alpha', createdAt: 10 }, { role: 'assistant', content: 'x', createdAt: 11 }] },
            b: { messages: [{ role: 'user', content: 'beta', createdAt: 12 }] }
        });

        const messages = await (base as SessionStore).listUserMessages(['a', 'b']);
        expect(messages).toEqual([{ content: 'alpha', createdAt: 10 }, { content: 'beta', createdAt: 12 }]);
    }
}
