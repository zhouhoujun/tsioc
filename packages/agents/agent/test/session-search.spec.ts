import expect = require('expect');
import { SessionStore } from '../src/memory/SessionStore';
import { runAgentOrmApp } from './helpers/agent-orm';

describe('SessionStore.search', () => {
    it('matches message content across sessions with count and snippet', async () => {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.append('s1', { id: '1', role: 'user', content: 'deploy the pipeline', createdAt: 1 } as any);
            await store.append('s1', { id: '2', role: 'assistant', content: 'pipeline is green', createdAt: 2 } as any);
            await store.append('s2', { id: '3', role: 'user', content: 'unrelated note', createdAt: 3 } as any);
            const results = await store.search('pipeline');
            expect(results.length).toEqual(1);
            expect(results[0].sessionId).toEqual('s1');
            expect(results[0].count).toEqual(2);
            expect(results[0].snippet).toContain('[user] deploy the pipeline');
        } finally { await ctx.close(); }
    });

    it('returns empty for no match or blank query', async () => {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.append('s1', { id: '1', role: 'user', content: 'hello world', createdAt: 1 } as any);
            expect(await store.search('missing')).toEqual([]);
            expect(await store.search('   ')).toEqual([]);
        } finally { await ctx.close(); }
    });

    it('is case-insensitive and applies limit', async () => {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            for (let i = 0; i < 5; i++) {
                await store.append(`s${i}`, { id: `${i}`, role: 'user', content: `Token EXPIRED ${i}`, createdAt: i } as any);
            }
            const limited = await store.search('expired', { limit: 2 });
            expect(limited.length).toEqual(2);
            expect(limited[0].count).toEqual(1);
            const unlimited = await store.search('EXPIRED');
            expect(unlimited.length).toEqual(5);
        } finally { await ctx.close(); }
    });

    it('matches persisted message content through the resolved session store', async () => {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.append('t1', { id: '1', role: 'user', content: 'search this transcript', createdAt: 1 } as any);
            await store.append('t1', { id: '2', role: 'assistant', content: 'found the needle', createdAt: 2 } as any);
            await store.append('t2', { id: '3', role: 'user', content: 'nothing here', createdAt: 3 } as any);
            const results = await store.search('needle');
            expect(results.length).toEqual(1);
            expect(results[0].sessionId).toEqual('t1');
            expect(results[0].count).toEqual(1);
            expect(results[0].snippet).toContain('[assistant] found the needle');
            expect(await store.search('missing')).toEqual([]);
        } finally { await ctx.close(); }
    });
});
