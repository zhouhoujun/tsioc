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

    @Test('runs cron task more than once')
    async runsCronTask() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't2-cron', sessionId: 's2', prompt: 'tick', cronExpr: '*/1 * * * * *' } as any);
        await new Promise(resolve => setTimeout(resolve, 2200));
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

    @Test('does not resurrect cron task cancelled while running')
    async doesNotResurrectCancelledRunningCronTask() {
        const runtime = new RuntimeStub();
        let release!: () => void;
        runtime.blocker = new Promise<void>(resolve => {
            release = resolve;
        });
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't4-cron', sessionId: 's4', prompt: 'cron-wait', cronExpr: '*/1 * * * * *' } as any);
        await new Promise(resolve => setTimeout(resolve, 1100));
        await scheduler.cancel('t4-cron');
        release();
        await new Promise(resolve => setTimeout(resolve, 1200));
        expect(scheduler.getTasks()).toEqual([]);
        expect(runtime.calls.length).toEqual(1);
        await scheduler.stop();
    }

    @Test('runs interval task immediately when runAt is omitted')
    async runsIntervalTaskImmediatelyWithoutRunAt() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't4-immediate', sessionId: 's4', prompt: 'immediate', intervalMs: 1000 });
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(runtime.calls).toEqual(['s4:immediate']);
        await scheduler.cancel('t4-immediate');
        await scheduler.stop();
    }

    @Test('does not resurrect cancelled cron task after failed run')
    async doesNotResurrectCancelledCronTaskAfterFailedRun() {
        class FailingRuntimeStub extends RuntimeStub {
            async runTurn(sessionId: string, input: string): Promise<any> {
                this.calls.push(`${sessionId}:${input}`);
                if (this.blocker) {
                    await this.blocker;
                }
                throw new Error('boom');
            }
        }
        const runtime = new FailingRuntimeStub();
        let release!: () => void;
        runtime.blocker = new Promise<void>(resolve => {
            release = resolve;
        });
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 't4-fail-cron', sessionId: 's4', prompt: 'cron-fail', cronExpr: '*/1 * * * * *' } as any);
        await new Promise(resolve => setTimeout(resolve, 1100));
        await scheduler.cancel('t4-fail-cron');
        release();
        await new Promise(resolve => setTimeout(resolve, 1200));
        expect(scheduler.getTasks()).toEqual([]);
        expect(runtime.calls.length).toEqual(1);
        await scheduler.stop();
    }

    @Test('rejects mismatched schedule type')
    async rejectsMismatchedScheduleType() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        let error: Error | undefined;
        try {
            await scheduler.schedule({ id: 'bad-shape', sessionId: 's4', prompt: 'bad', scheduleType: 'interval', runAt: Date.now() + 20 } as any);
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('scheduleType');
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

    @Test('persists paused state and skips paused task reload until resumed')
    async persistsPausedStateAndSkipsPausedTaskReloadUntilResumed() {
        const ctx = await Application.run(SchedulerOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const runtime = new RuntimeStub();
            const scheduler = new IntervalAgentScheduler(runtime as any, ctx as any);
            (scheduler as any).adapter = adapter;

            const scheduled = await scheduler.schedule({
                id: 'persisted-paused',
                sessionId: 's-paused',
                prompt: 'pause-me',
                runAt: Date.now() + 200
            });
            const paused = await scheduler.pause('persisted-paused');
            expect(paused?.paused).toEqual(true);

            const storedPaused = await adapter.getRepository(AgentScheduledTaskEntity).findOne({ where: { id: 'persisted-paused' } as any });
            expect(storedPaused?.paused).toEqual(true);
            await scheduler.stop();

            const restarted = new IntervalAgentScheduler(runtime as any, ctx as any);
            (restarted as any).adapter = adapter;
            await restarted.start();
            await new Promise(resolve => setTimeout(resolve, 250));
            expect(runtime.calls).toEqual([]);
            expect(restarted.getTask('persisted-paused')?.paused).toEqual(true);

            const resumed = await restarted.resume('persisted-paused');
            expect(resumed?.paused).toEqual(false);
            await new Promise(resolve => setTimeout(resolve, 80));
            expect(runtime.calls).toEqual(['s-paused:pause-me']);
            const remaining = await adapter.getRepository(AgentScheduledTaskEntity).find();
            expect(remaining.length).toEqual(0);
            await restarted.stop();
            expect(scheduled.id).toEqual('persisted-paused');
        } finally {
            await ctx.close();
        }
    }

    @Test('pause while running prevents repeat reschedule after completion')
    async pauseWhileRunningPreventsRepeatRescheduleAfterCompletion() {
        const runtime = new RuntimeStub();
        let release!: () => void;
        runtime.blocker = new Promise<void>(resolve => {
            release = resolve;
        });
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        await scheduler.schedule({ id: 'pause-running', sessionId: 's5', prompt: 'hold', intervalMs: 10, runAt: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 20));
        const paused = await scheduler.pause('pause-running');
        expect(paused?.paused).toEqual(true);
        expect(paused?.running).toEqual(true);
        release();
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(runtime.calls).toEqual(['s5:hold']);
        const task = scheduler.getTask('pause-running');
        expect(task?.paused).toEqual(true);
        expect(task?.running).toEqual(false);
        await new Promise(resolve => setTimeout(resolve, 40));
        expect(runtime.calls).toEqual(['s5:hold']);
        await scheduler.stop();
    }

    @Test('prompt-only update preserves interval next run')
    async promptOnlyUpdatePreservesIntervalNextRun() {
        const runtime = new RuntimeStub();
        const scheduler = new IntervalAgentScheduler(runtime as any, new FakeApp() as any);
        const task = await scheduler.schedule({ id: 'update-prompt-only', sessionId: 's6', prompt: 'before', intervalMs: 1000, runAt: Date.now() + 5000 });
        const updated = await scheduler.update('update-prompt-only', { prompt: 'after' });
        expect(updated?.prompt).toEqual('after');
        expect(updated?.nextRunAt).toEqual(task.nextRunAt);
        await scheduler.stop();
    }

    @Test('persists cron task metadata and computes next run')
    async persistsCronTaskMetadata() {
        const ctx = await Application.run(SchedulerOrmTestModule);
        try {
            const adapter = ctx.get(TypeormAdapter) as TypeormAdapter;
            const runtime = new RuntimeStub();
            const scheduler = new IntervalAgentScheduler(runtime as any, ctx as any);
            (scheduler as any).adapter = adapter;

            const task = await scheduler.schedule({
                id: 'persisted-cron',
                sessionId: 's3',
                prompt: 'cron',
                cronExpr: '*/5 * * * * *'
            } as any);

            expect(task.nextRunAt).toBeGreaterThan(Date.now());
            const stored = await adapter.getRepository(AgentScheduledTaskEntity).findOne({ where: { id: 'persisted-cron' } as any });
            expect(stored?.cronExpr).toEqual('*/5 * * * * *');
            expect(stored?.scheduleType).toEqual('cron');
            await scheduler.stop();
        } finally {
            await ctx.close();
        }
    }
}
