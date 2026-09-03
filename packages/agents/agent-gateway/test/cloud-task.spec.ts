import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentModule, MemoryStore, provideAgentOrm, SessionStore } from '@tsdi/agent';
import { Application, RandomUuidGenerator } from '@tsdi/core';
import { CloudTaskQueue } from '../src/cloud/CloudTaskQueue';
import { AppRpcServer } from '../src/app-rpc/AppRpcServer';
import { SessionOwnerStore } from '../src/auth/SessionOwnerStore';
import { SessionHandler } from '../src/api/SessionHandler';
import { EventHandler } from '../src/api/EventHandler';

async function waitFor(predicate: () => boolean): Promise<void> {
    for (let i = 0; i < 100; i++) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    throw new Error('condition timed out');
}

@Suite('Gateway cloud task queue (P150)')
export class CloudTaskQueueTest {
    @Test('deduplicates external trigger retries by principal source and event id')
    async deduplicatesExternalTriggers() {
        let turns = 0;
        const runtime = {
            async runTurn() { turns += 1; return { ok: true }; },
            async getMessages() { return []; }
        } as any;
        const queue = new CloudTaskQueue(runtime, new RandomUuidGenerator());
        const input = {
            principalId: 'u1', prompt: 'review pull request', source: 'github', externalId: 'delivery-42',
            metadata: { repository: 'org/repo' }
        };
        const first = queue.submit(input);
        const duplicate = queue.submit({ ...input, prompt: 'changed retry payload' });
        const otherPrincipal = queue.submit({ ...input, principalId: 'u2' });

        expect(duplicate.id).toEqual(first.id);
        expect(duplicate.prompt).toEqual('review pull request');
        expect(duplicate.metadata).toEqual({ repository: 'org/repo' });
        expect(otherPrincipal.id).not.toEqual(first.id);
        await waitFor(() => queue.get(first.id, 'u1')?.status === 'completed' && queue.get(otherPrincipal.id, 'u2')?.status === 'completed');
        expect(turns).toEqual(2);
    }

    @Test('submit runs a headless turn and apply retrieves the result idempotently')
    async submitAndApply() {
        let automationSession = '';
        const runtime = {
            async markSessionAutomation(sessionId: string) { automationSession = sessionId; },
            async runTurn(sessionId: string, prompt: string) { return { sessionId, output: prompt.toUpperCase() }; },
            async getMessages() { return [{ id: 'a1', role: 'assistant', content: 'done' }]; }
        } as any;
        const queue = new CloudTaskQueue(runtime, new RandomUuidGenerator());
        const submitted = queue.submit({ principalId: 'u1', prompt: 'ship it' });
        expect(submitted.status).toEqual('queued');
        await waitFor(() => queue.get(submitted.id, 'u1')?.status === 'completed');
        expect(automationSession).toEqual(submitted.sessionId);

        const applied = queue.apply(submitted.id, 'u1')!;
        const appliedAgain = queue.apply(submitted.id, 'u1')!;
        expect(applied.result.message.content).toEqual('done');
        expect(appliedAgain.appliedAt).toEqual(applied.appliedAt);
        expect(queue.get(submitted.id, 'u2')).toEqual(undefined);
    }

    @Test('cancel stops a running task and preserves owner isolation')
    async cancelRunningTask() {
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        let cancelledSession = '';
        const runtime = {
            async runTurn() { await gate; return {}; },
            async getMessages() { return []; },
            async cancelTurn(sessionId: string) { cancelledSession = sessionId; release(); return { cancelled: true, compensated: 0, toolCallIds: [] }; }
        } as any;
        const queue = new CloudTaskQueue(runtime, new RandomUuidGenerator());
        const task = queue.submit({ principalId: 'u1', prompt: 'wait' });
        await waitFor(() => queue.get(task.id, 'u1')?.status === 'running');

        expect(await queue.cancel(task.id, 'u2')).toEqual(undefined);
        const cancelled = await queue.cancel(task.id, 'u1');
        expect(cancelled?.status).toEqual('cancelled');
        expect(cancelledSession).toEqual(task.sessionId);
    }

    @Test('cloud task RPCs submit list get and apply for the owning principal')
    async cloudTaskRpcs() {
        const runtime = {
            async runTurn() { return { ok: true }; },
            async getMessages() { return [{ id: 'a1', role: 'assistant', content: 'result' }]; }
        } as any;
        const uuid = new RandomUuidGenerator();
        const context = await Application.run({ module: AgentModule, providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
        const store = context.get(SessionStore);
        const memory = context.get(MemoryStore);
        const owners = new SessionOwnerStore(store);
        const sessions = new SessionHandler(runtime, store, owners);
        const events = new EventHandler(owners);
        const queue = new CloudTaskQueue(runtime, uuid);
        const rpc = new (AppRpcServer as any)(runtime, uuid, store, memory, { getToolDefinitions: () => [] }, owners, sessions, events,
            undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, queue) as AppRpcServer;
        const call = async (method: string, params: any = {}, principalId = 'u1') => {
            const response: any = await rpc.handle({ jsonrpc: '2.0', id: 1, method, params }, { principalId });
            return response;
        };

        const submitted = await call('cloud.task.submit', { prompt: 'do work', source: 'github', externalId: 'delivery-42' });
        const taskId = submitted.result.task.id;
        const duplicate = await call('cloud.task.submit', { prompt: 'retry payload', source: 'github', externalId: 'delivery-42' });
        expect(duplicate.result.task.id).toEqual(taskId);
        expect(duplicate.result.deduplicated).toEqual(true);
        await waitFor(() => queue.get(taskId, 'u1')?.status === 'completed');
        expect((await call('cloud.task.list')).result.tasks.length).toEqual(1);
        expect((await call('cloud.task.get', { taskId })).result.task.status).toEqual('completed');
        expect((await call('cloud.task.apply', { taskId })).result.task.result.message.content).toEqual('result');
        expect((await call('cloud.task.get', { taskId }, 'u2')).error.code).toEqual(-32004);
    }
}
