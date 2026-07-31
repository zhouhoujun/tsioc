import expect = require('expect');
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AgentOrmModule } from '../src/orm.module';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
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
class SessionSearchTestModule {
}

describe('SessionStore.search', () => {
    it('matches message content across sessions with count and snippet (in-memory)', async () => {
        const store = new InMemorySessionStore();
        await store.append('s1', { id: '1', role: 'user', content: 'deploy the pipeline', createdAt: 1 });
        await store.append('s1', { id: '2', role: 'assistant', content: 'pipeline is green', createdAt: 2 });
        await store.append('s2', { id: '3', role: 'user', content: 'unrelated note', createdAt: 3 });
        const results = await store.search('pipeline');
        expect(results.length).toEqual(1);
        expect(results[0].sessionId).toEqual('s1');
        expect(results[0].count).toEqual(2);
        expect(results[0].snippet).toContain('[user] deploy the pipeline');
    });

    it('returns empty for no match or blank query (in-memory)', async () => {
        const store = new InMemorySessionStore();
        await store.append('s1', { id: '1', role: 'user', content: 'hello world', createdAt: 1 });
        expect(await store.search('missing')).toEqual([]);
        expect(await store.search('   ')).toEqual([]);
    });

    it('is case-insensitive and applies limit (in-memory)', async () => {
        const store = new InMemorySessionStore();
        for (let i = 0; i < 5; i++) {
            await store.append(`s${i}`, { id: `${i}`, role: 'user', content: `Token EXPIRED ${i}`, createdAt: i });
        }
        const limited = await store.search('expired', { limit: 2 });
        expect(limited.length).toEqual(2);
        expect(limited[0].count).toEqual(1);
        const unlimited = await store.search('EXPIRED');
        expect(unlimited.length).toEqual(5);
    });

    it('matches persisted message content through TypeOrmSessionStore', async () => {
        const ctx = await Application.run(SessionSearchTestModule);
        try {
            const store = ctx.get(TypeOrmSessionStore) as TypeOrmSessionStore;
            await store.append('t1', { id: '1', role: 'user', content: 'search this transcript', createdAt: 1 });
            await store.append('t1', { id: '2', role: 'assistant', content: 'found the needle', createdAt: 2 });
            await store.append('t2', { id: '3', role: 'user', content: 'nothing here', createdAt: 3 });
            const results = await store.search('needle');
            expect(results.length).toEqual(1);
            expect(results[0].sessionId).toEqual('t1');
            expect(results[0].count).toEqual(1);
            expect(results[0].snippet).toContain('[assistant] found the needle');
            expect(await store.search('missing')).toEqual([]);
        } finally {
            await ctx.close();
        }
    });
});
