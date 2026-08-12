import { RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { BackgroundTaskManager } from '../src/background-task-manager';
import { NestedAgentRunRequest, NestedAgentRunResult, NestedAgentRunner } from '../src/nested-agent-runner';

class ControlledRunner extends NestedAgentRunner {
    constructor(private handler: (request: NestedAgentRunRequest) => Promise<NestedAgentRunResult>) {
        super();
    }

    override async run(request: NestedAgentRunRequest): Promise<NestedAgentRunResult> {
        return this.handler(request);
    }
}

interface FakeApplicationContext {
    publishEvent(event: any): Promise<void>;
}

function createApp(events: any[]): FakeApplicationContext {
    return {
        publishEvent: async event => {
            events.push(event);
        }
    };
}

@Suite('BackgroundTaskManager')
export class BackgroundTaskManagerTest {
    @Test('start returns immediately with a running record and collects the result later')
    async fireAndCollect() {
        const events: any[] = [];
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => ({ content: 'final answer', sessionId: 'worker-1', turnCount: 2, toolCalls: 3 })),
            createApp(events) as any
        );
        const record = manager.start({ prompt: 'Research the topic' }, 'session-a');
        expect(record.status).toEqual('running');
        expect(record.sessionId).toEqual('session-a');
        expect(record.id).toMatch(/^bg-/);
        expect(record.result).toBeUndefined();

        const completed = await manager.wait(record.id, 5000);
        expect(completed.status).toEqual('completed');
        expect(completed.result?.content).toEqual('final answer');
        expect(completed.finishedAt).toBeGreaterThan(0);

        const started = events.find(e => e.constructor.name === 'AgentBackgroundTaskStartedEvent');
        const finished = events.find(e => e.constructor.name === 'AgentBackgroundTaskCompletedEvent');
        expect(started?.taskId).toEqual(record.id);
        expect(finished?.taskId).toEqual(record.id);
        expect(finished?.summary).toEqual('final answer');
    }

    @Test('failed tasks publish a failure event and record the error')
    async failurePropagation() {
        const events: any[] = [];
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => { throw new Error('worker crashed'); }),
            createApp(events) as any
        );
        const record = manager.start({ prompt: 'Do risky work' }, 'session-a');
        const failed = await manager.wait(record.id, 5000);
        expect(failed.status).toEqual('failed');
        expect(failed.error).toContain('worker crashed');

        const event = events.find(e => e.constructor.name === 'AgentBackgroundTaskFailedEvent');
        expect(event?.taskId).toEqual(record.id);
        expect(event?.error.message).toEqual('worker crashed');
    }

    @Test('list filters tasks by owner session and sorts newest first')
    async listBySession() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const first = manager.start({ prompt: 'task one' }, 'session-a');
        await new Promise(resolve => setTimeout(resolve, 5));
        const second = manager.start({ prompt: 'task two' }, 'session-a');
        manager.start({ prompt: 'other session' }, 'session-b');

        const listed = manager.list('session-a');
        expect(listed.map(t => t.id)).toEqual([second.id, first.id]);
        expect(manager.list('session-b').length).toEqual(1);
    }

    @Test('cancel marks a running task as cancelled')
    async cancelRunningTask() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const record = manager.start({ prompt: 'long task' }, 'session-a');
        expect(manager.cancel(record.id)).toEqual(true);
        const cancelled = await manager.wait(record.id, 5000);
        expect(cancelled.status).toEqual('cancelled');
        expect(manager.cancel(record.id)).toEqual(false);
        expect(manager.cancel('missing')).toEqual(false);
    }

    @Test('wait returns the current record when the timeout elapses')
    async waitTimeout() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const record = manager.start({ prompt: 'slow task' }, 'session-a');
        const timedOut = await manager.wait(record.id, 50);
        expect(timedOut.status).toEqual('running');
    }
}
