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

    @Test('cancelBatch reports per-task success and failure detail')
    async cancelBatchOutcomes() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const a = manager.start({ prompt: 'task a' }, 'session');
        const b = manager.start({ prompt: 'task b' }, 'session');
        expect(manager.cancel(b.id)).toEqual(true);
        const outcomes = manager.cancelBatch([a.id, b.id, 'missing']);
        const byId = Object.fromEntries(outcomes.map(o => [o.id, o]));
        expect(byId[a.id]).toEqual({ id: a.id, cancelled: true });
        expect(byId[b.id]).toEqual({ id: b.id, cancelled: false, reason: 'not-running' });
        expect(byId['missing']).toEqual({ id: 'missing', cancelled: false, reason: 'not-found' });
        expect(manager.cancelMany([a.id])).toEqual(0);
    }

    @Test('restoreBatch restores a live cancelled task back to running')
    async restoreLive() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const t = manager.start({ prompt: 'live task' }, 'session');
        expect(manager.cancel(t.id)).toEqual(true);
        const outcomes = manager.restoreBatch([t.id]);
        expect(outcomes).toEqual([{ id: t.id, restored: true }]);
        const restored = await manager.wait(t.id, 1000);
        expect(restored.status).toEqual('running');
        expect(restored.finishedAt).toBeUndefined();
    }

    @Test('restoreBatch with no ids undoes the last cancel batch')
    async restoreUndoWindow() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const a = manager.start({ prompt: 'task a' }, 'session');
        const b = manager.start({ prompt: 'task b' }, 'session');
        manager.cancelBatch([a.id, b.id]);
        const undo = manager.restoreBatch([]);
        expect(undo.map(o => o.id).sort()).toEqual([a.id, b.id].sort());
        expect(undo.every(o => o.restored)).toEqual(true);
        expect((await manager.wait(a.id, 1000)).status).toEqual('running');
        expect((await manager.wait(b.id, 1000)).status).toEqual('running');
    }

    @Test('restoreBatch reports non-restorable tasks')
    async restoreFailures() {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => new Promise(() => { })),
            undefined as any
        );
        const t = manager.start({ prompt: 'task' }, 'session');
        const outcomes = manager.restoreBatch([t.id, 'missing']);
        expect(outcomes).toContainEqual({ id: t.id, restored: false, reason: 'not-cancelled' });
        expect(outcomes).toContainEqual({ id: 'missing', restored: false, reason: 'not-found' });
    }

    @Test('restoreBatch refuses to restore a task whose run already finished')
    async restoreSettled() {
        const events: any[] = [];
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => {
                await new Promise(resolve => setTimeout(resolve, 20));
                return { content: 'done', sessionId: 'w', turnCount: 1, toolCalls: 0 };
            }),
            createApp(events) as any
        );
        const t = manager.start({ prompt: 'settled task' }, 'session');
        expect(manager.cancel(t.id)).toEqual(true);
        await new Promise(resolve => setTimeout(resolve, 50));
        const outcomes = manager.restoreBatch([t.id]);
        expect(outcomes).toEqual([{ id: t.id, restored: false, reason: 'already-finished' }]);
    }
}
