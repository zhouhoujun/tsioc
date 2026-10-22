import { Application } from '@tsdi/core';
import { AgentModule, SessionStore, provideAgentOrm } from '@tsdi/agent';

async function main() {
    const [sessionId, countRaw] = process.argv.slice(2);
    const count = Number(countRaw || 50);
    const ctx = await Application.run({
        module: AgentModule,
        providers: provideAgentOrm({ type: 'sqljs' as any, location: '/tmp/opencode/root-conc/agent.db', autoSave: true, autoLoadEntities: false as any, synchronize: true, entities: [] as any } as any)
    });
    try {
        const store = ctx.get(SessionStore);
        for (let i = 0; i < count; i++) {
            await store.append(sessionId, { id: `${sessionId}-${i}`, role: 'user', content: `msg ${i}`, createdAt: Date.now() } as any);
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    } finally {
        await ctx.close();
    }
}
main().then(() => process.exit(0), err => { console.error(err); process.exit(1); });
