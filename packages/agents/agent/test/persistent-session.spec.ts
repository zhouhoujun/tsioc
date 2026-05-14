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
});
