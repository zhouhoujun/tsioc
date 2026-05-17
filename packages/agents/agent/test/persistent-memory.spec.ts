import expect = require('expect');
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AgentOrmModule } from '../src/orm.module';
import { TypeOrmMemoryStore } from '../src/memory/TypeOrmMemoryStore';

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
        TypeOrmMemoryStore
    ]
})
class PersistentMemoryTestModule {
}

describe('Persistent memory store', () => {
    it('returns session and global memories to the same session', async () => {
        const ctx = await Application.run(PersistentMemoryTestModule);
        try {
            const store = ctx.get(TypeOrmMemoryStore) as TypeOrmMemoryStore;
            await store.put({ id: 'g1', key: 'team', value: 'agents', scope: 'global', createdAt: 1 });
            await store.put({ id: 's1', sessionId: 'session-1', key: 'topic', value: 'router', scope: 'session', createdAt: 2 });
            await store.put({ id: 's2', sessionId: 'session-2', key: 'topic', value: 'cache', scope: 'session', createdAt: 3 });

            const records = await store.getAll('session-1');
            expect(records.map((r: any) => r.id)).toEqual(['g1', 's1']);
        } finally {
            await ctx.close();
        }
    });

    it('searches within visible global and session memories', async () => {
        const ctx = await Application.run(PersistentMemoryTestModule);
        try {
            const store = ctx.get(TypeOrmMemoryStore) as TypeOrmMemoryStore;
            await store.put({ id: 'g1', key: 'preference', value: 'typescript', scope: 'global', createdAt: 1 });
            await store.put({ id: 's1', sessionId: 'session-1', key: 'topic', value: 'router', scope: 'session', createdAt: 2 });
            await store.put({ id: 's2', sessionId: 'session-2', key: 'topic', value: 'typescript cache', scope: 'session', createdAt: 3 });

            const records = await store.search('type', 'session-1');
            expect(records.map((r: any) => r.id)).toEqual(['g1']);
        } finally {
            await ctx.close();
        }
    });

    it('deletes only current session memory unless global scope is requested', async () => {
        const ctx = await Application.run(PersistentMemoryTestModule);
        try {
            const store = ctx.get(TypeOrmMemoryStore) as TypeOrmMemoryStore;
            await store.put({ id: 'g1', key: 'team', value: 'agents', scope: 'global', createdAt: 1 });
            await store.put({ id: 's1', sessionId: 'session-1', key: 'topic', value: 'router', scope: 'session', createdAt: 2 });
            await store.put({ id: 's2', sessionId: 'session-2', key: 'topic', value: 'cache', scope: 'session', createdAt: 3 });

            expect(await store.delete('s1', 'session-1')).toEqual(1);
            expect(await store.delete('s2', 'session-1')).toEqual(0);
            expect(await store.delete('g1', 'session-1')).toEqual(0);
            expect(await store.delete('g1', 'session-1', 'global')).toEqual(1);
            expect((await store.getAll('session-1')).map((r: any) => r.id)).toEqual([]);
            expect((await store.getAll('session-2')).map((r: any) => r.id)).toEqual(['s2']);
        } finally {
            await ctx.close();
        }
    });
});
