import expect = require('expect');
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { AuditSink } from '../src/harness/AuditSink';
import { InMemoryAuditSink } from '../src/harness/InMemoryAuditSink';
import { TypeOrmAuditSink } from '../src/harness/TypeOrmAuditSink';
import { AgentAuditLogEntity } from '../src/memory/entities';

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
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() }
    ]
})
class AuditOrmTestModule {}

@Module({
    imports: [
        AgentModule,
        AgentOrmModule.withConnection({
            type: 'sqljs' as any,
            autoLoadEntities: false as any,
            synchronize: true,
            autoSave: false,
            entities: []
        } as any)
    ],
    providers: [
        { provide: ModuleLoader, useValue: new DefaultModuleLoader() }
    ]
})
class AgentAuditOrmTestModule {}

describe('Audit sinks', () => {
    it('in-memory audit sink snapshots appended records immutably', async () => {
        const sink = new InMemoryAuditSink();
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
        const ctx = await Application.run(AuditOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const sink = new TypeOrmAuditSink(adapter);
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
        } finally {
            await ctx.close();
        }
    });

    it('agent module falls back to usable in-memory audit sink without orm adapter', async () => {
        const ctx = await Application.run(AgentModule);
        try {
            const sink = ctx.get(AuditSink);
            await sink.append({
                id: 'fallback-a1',
                sessionId: 'fallback-session',
                toolName: 'echo',
                toolCallId: 'tool-fallback',
                status: 'success',
                createdAt: 3
            });
            const records = await sink.list('fallback-session');
            expect(records.length).toEqual(1);
            expect(records[0].toolCallId).toEqual('tool-fallback');
        } finally {
            await ctx.close();
        }
    });

    it('agent module resolves durable audit sink behavior when orm adapter exists', async () => {
        const ctx = await Application.run(AgentAuditOrmTestModule);
        try {
            const sink = ctx.get(AuditSink);
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
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
        } finally {
            await ctx.close();
        }
    });
});
