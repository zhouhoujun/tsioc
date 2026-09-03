import expect = require('expect');
import { After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AuditSink } from '../src/harness/AuditSink';
import { AgentAuditLogEntity } from '../src/memory/entities';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

describe('Audit sinks', () => {
    let ctx: ApplicationContext | undefined;

    afterEach(async () => { await ctx?.close(); ctx = undefined; });

    it('audit sink snapshots appended records immutably', async () => {
        const c = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        ctx = c;
        const sink = c.get(AuditSink);
        const metadata = { nested: { value: 'safe' } };
        await sink.append({
            id: 'a1',
            sessionId: 's1',
            toolName: 'echo',
            toolCallId: 'tool-1',
            status: 'success',
            createdAt: 1,
            metadata
        });
        metadata.nested.value = 'mutated';
        const records = await sink.list('s1');
        expect(records.length).toEqual(1);
        expect((records[0].metadata as any).nested.value).toEqual('safe');
    });

    it('typeorm audit sink persists and reloads audit records', async () => {
        const c = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        ctx = c;
        const sink = c.get(AuditSink);
        const adapter = c.get(TypeormAdapter) as TypeormAdapter;
        await sink.append({
            id: 'db-a1',
            sessionId: 's-db',
            toolName: 'echo',
            toolCallId: 'tool-db',
            status: 'error',
            error: 'boom',
            attemptCount: 2,
            createdAt: 2,
            metadata: { executionMode: 'sequential' }
        });
        const records = await sink.list('s-db');
        expect(records.length).toEqual(1);
        expect(records[0].toolName).toEqual('echo');
        expect(records[0].error).toEqual('boom');
        expect(records[0].attemptCount).toEqual(2);
        const stored = await adapter.getRepository(AgentAuditLogEntity).findOne({ where: { id: 'db-a1' } as any });
        expect(stored?.toolCallId).toEqual('tool-db');
    });

    it('agent module resolves durable audit sink behavior when orm adapter exists', async () => {
        const c = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        ctx = c;
        const sink = c.get(AuditSink);
        const adapter = c.get(TypeormAdapter) as TypeormAdapter;
        await sink.append({
            id: 'wired-db-a1',
            sessionId: 'wired-session',
            toolName: 'echo',
            toolCallId: 'tool-wired',
            status: 'success',
            createdAt: 4
        });
        const stored = await adapter.getRepository(AgentAuditLogEntity).findOne({ where: { id: 'wired-db-a1' } as any });
        expect(stored?.toolCallId).toEqual('tool-wired');
    });
});
