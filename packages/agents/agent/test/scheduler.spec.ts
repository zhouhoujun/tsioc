import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { IntervalAgentScheduler } from '../src/scheduler/IntervalAgentScheduler';

class RuntimeStub {
    calls: string[] = [];
    async runTurn(sessionId: string, input: string): Promise<any> {
        this.calls.push(`${sessionId}:${input}`);
        return { sessionId, message: { id: '1', role: 'assistant', content: input, createdAt: Date.now() } };
    }
}

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

@Suite('Agent scheduler')
export class SchedulerTest {
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
}
