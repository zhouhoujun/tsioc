import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentModule } from '../src/agent.module';
import { AgentOrmModule } from '../src/orm.module';
import { IntervalAgentScheduler } from '../src/scheduler/IntervalAgentScheduler';
import { AgentScheduledTaskEntity } from '../src/memory/entities';

class RuntimeStub {
    calls: string[] = [];
    blocker?: Promise<void>;
    async runTurn(sessionId: string, input: string): Promise<any> {
        this.calls.push(`${sessionId}:${input}`);
        if (this.blocker) {
            await this.blocker;
        }
        return { sessionId, message: { id: '1', role: 'assistant', content: input, createdAt: Date.now() } };
    }
}

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

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
        { provide: 'runtime-stub', useClass: RuntimeStub }
    ]
})
class SchedulerOrmTestModule {
}

@Suite('Agent scheduler')
export class SchedulerTest {
    @Test('agent module resolves scheduler without orm adapter')
    async resolvesSchedulerWithoutOrmAdapter() {
        const ctx = await Application.run(AgentModule);
        try {
            const scheduler = ctx.get(IntervalAgentScheduler);
            expect(!!scheduler).toEqual(true);
            await scheduler.stop();
        } finally {
            await ctx.close();
        }
    }

    @Test('runs one-shot task')
    async runsTask() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't1', sessionId: 's1', prompt: 'ping', runAt: Date.now() + 10 });
        await new Promise(resolve => setTimeout(resolve, 30));
        expect(runtime.calls).toEqual(['s1:ping']);
        await scheduler.stop();
    }

    @Test('runs interval task more than once')
    async runsIntervalTask() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't2', sessionId: 's2', prompt: 'tick', intervalMs: 10 });
        await new Promise(resolve => setTimeout(resolve, 35));
        expect(runtime.calls.length).toBeGreaterThanOrEqual(2);
        expect(runtime.calls[0]).toEqual('s2:tick');
        await scheduler.stop();
    }

    @Test('cancels scheduled task before execution')
    async cancelsTask() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't3', sessionId: 's3', prompt: 'stop', runAt: Date.now() + 30 });
        await scheduler.cancel('t3');
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(runtime.calls).toEqual([]);
        expect(scheduler.getTasks()).toEqual([]);
        await scheduler.stop();
    }

    @Test('does not resurrect interval task cancelled while running')
    async doesNotResurrectCancelledRunningIntervalTask() {
        const runtime = new RuntimeStub();
        let release!: () => void;
        runtime.blocker = new Promise<void>(resolve => {
            release = resolve;
        });
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't4', sessionId: 's4', prompt: 'wait', intervalMs: 10, runAt: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 20));
        await scheduler.cancel('t4');
        release();
        await new Promise(resolve => setTimeout(resolve, 30));
        expect(scheduler.getTasks()).toEqual([]);
        expect(runtime.calls.length).toEqual(1);
        await scheduler.stop();
    }

    @Test('reloads persisted one-shot tasks on start')
    async reloadsPersistedTasks() {
        const ctx = await Application.run(SchedulerOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            await adapter.getRepository(AgentScheduledTaskEntity).save({
                id: 'persisted-1',
                sessionId: 's1',
                prompt: 'persisted',
                runAt: Date.now() + 20,
                nextRunAt: Date.now() + 20,
                cancelled: false,
                running: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                runCount: 0,
                failureCount: 0
            } as any);

            const runtime = new RuntimeStub();
            const scheduler = new IntervalAgentScheduler(runtime as any, ctx as any);
            (scheduler as any).adapter = adapter;
            await scheduler.start();
            await new Promise(resolve => setTimeout(resolve, 60));

            expect(runtime.calls).toEqual(['s1:persisted']);
            const remaining = await adapter.getRepository(AgentScheduledTaskEntity).find();
            expect(remaining.length).toEqual(0);
            await scheduler.stop();
        } finally {
            await ctx.close();
        }
    }

    @Test('reloads stale running persisted task after restart')
    async reloadsStaleRunningTask() {
        const ctx = await Application.run(SchedulerOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const now = Date.now();
            await adapter.getRepository(AgentScheduledTaskEntity).save({
                id: 'persisted-running',
                sessionId: 's2',
                prompt: 'recover',
                runAt: now - 20,
                nextRunAt: now - 20,
                cancelled: false,
                running: true,
                createdAt: now - 100,
                updatedAt: now - 100,
                runCount: 0,
                failureCount: 0
            } as any);

            const runtime = new RuntimeStub();
            const scheduler = new IntervalAgentScheduler(runtime as any, ctx as any);
            (scheduler as any).adapter = adapter;
            await scheduler.start();
            await new Promise(resolve => setTimeout(resolve, 60));

            expect(runtime.calls).toEqual(['s2:recover']);
            const remaining = await adapter.getRepository(AgentScheduledTaskEntity).find();
            expect(remaining.length).toEqual(0);
            await scheduler.stop();
        } finally {
            await ctx.close();
        }
    }
}
