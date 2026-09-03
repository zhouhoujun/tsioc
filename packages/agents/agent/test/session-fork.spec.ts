import expect = require('expect');
import { Test } from '@tsdi/unit';
import { SessionStore } from '../src/memory/SessionStore';
import { runAgentOrmApp } from './helpers/agent-orm';

export class SessionForkSpec {
    @Test('forks a session transcript and preserves branch lineage')
    async forksTranscript() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await store.append('source', { id: 'u1', role: 'user', content: 'one', createdAt: 1 } as any);
            await store.append('source', { id: 'a1', role: 'assistant', content: 'two', createdAt: 2 } as any);
            await store.setProjectMetadata('source', { projectId: 'p1', primaryThreadId: 'thread-1', rootRequest: 'one' });
            const fork = await store.fork('source', 'u1', 'branch-1');
            expect(fork.sessionId).toBe('branch-1');
            expect(fork.messages).toHaveLength(1);
            expect(fork.sessionRole).toBe('branch');
            expect(fork.originThreadId).toBe('thread-1');
            expect(fork.primaryThreadId).toBe('thread-1');
        } finally { await ctx.close(); }
    }

    @Test('rejects an unknown fork message')
    async rejectsUnknownMessage() {
        const ctx = await runAgentOrmApp();
        try {
            const store = ctx.get(SessionStore);
            await expect(store.fork('missing', 'nope')).rejects.toThrow("Message 'nope'");
        } finally { await ctx.close(); }
    }
}
