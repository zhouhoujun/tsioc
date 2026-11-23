import expect = require('expect');
import { Application } from '@tsdi/core';
import { Suite, Test } from '@tsdi/unit';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';
import { SessionStore } from '../src/memory/SessionStore';
import { SessionTurnLeaseManager } from '../src/runtime/SessionTurnLeaseManager';

async function store(): Promise<{ sessions: SessionStore; close(): Promise<void> }> {
    const ctx = await Application.run(AgentModule, {
        providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any)
    });
    return { sessions: ctx.get(SessionStore), close: () => ctx.close() };
}

@Suite('session turn lease')
export class SessionLeaseTest {
    @Test('only one owner can hold the lease and renewal keeps it')
    async exclusive() {
        const { sessions, close } = await store();
        try {
            expect(await sessions.acquireTurnLease('s1', 'owner-a', 10_000)).toEqual(true);
            expect(await sessions.acquireTurnLease('s1', 'owner-b', 10_000)).toEqual(false);
            expect(await sessions.renewTurnLease('s1', 'owner-b', 10_000)).toEqual(false);
            expect(await sessions.renewTurnLease('s1', 'owner-a', 10_000)).toEqual(true);
            await sessions.releaseTurnLease('s1', 'owner-a');
            expect(await sessions.acquireTurnLease('s1', 'owner-b', 10_000)).toEqual(true);
            await sessions.releaseTurnLease('s1', 'owner-b');
        } finally {
            await close();
        }
    }

    @Test('the lease manager ref-counts queued turns for one process')
    async refCounts() {
        let acquired = 0;
        let released = 0;
        const sessions: any = {
            acquireTurnLease: async () => { acquired += 1; return true; },
            renewTurnLease: async () => true,
            releaseTurnLease: async () => { released += 1; }
        };
        const manager = new SessionTurnLeaseManager(sessions, 'owner-a', 10_000, 60_000);
        const first = await manager.enter('s1');
        const second = await manager.enter('s1');
        expect(acquired).toEqual(1);
        first();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(released).toEqual(0);
        second();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(released).toEqual(1);
    }
}
