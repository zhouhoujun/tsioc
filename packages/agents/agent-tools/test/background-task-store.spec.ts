import { RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    BackgroundTaskRecord,
    BackgroundTaskHistoryStore,
    decodeBackgroundTaskCursor,
    encodeBackgroundTaskCursor
} from '../src/background-task-store';
import { BackgroundTaskManager } from '../src/background-task-manager';
import { NestedAgentRunRequest, NestedAgentRunResult, NestedAgentRunner } from '../src/nested-agent-runner';
import { Application } from '@tsdi/core';
import { AgentModule, provideAgentOrm, BACKGROUND_TASK_HISTORY_STORE } from '@tsdi/agent';

async function withStore<T>(fn: (store: BackgroundTaskHistoryStore) => Promise<T>): Promise<T> {
    const ctx = await Application.run(AgentModule, { providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any) });
    try { return await fn(ctx.get(BACKGROUND_TASK_HISTORY_STORE)); } finally { await ctx.close(); }
}

class ControlledRunner extends NestedAgentRunner {
    constructor(private handler: (request: NestedAgentRunRequest) => Promise<NestedAgentRunResult>) {
        super();
    }

    override async run(request: NestedAgentRunRequest): Promise<NestedAgentRunResult> {
        return this.handler(request);
    }
}

function record(overrides: Partial<BackgroundTaskRecord> & Pick<BackgroundTaskRecord, 'id' | 'sessionId' | 'status' | 'goal' | 'startedAt'>): BackgroundTaskRecord {
    return { ...overrides, ...(overrides.startedAt !== undefined && overrides.updatedAt === undefined ? { updatedAt: overrides.startedAt } : {}) };
}

@Suite('BackgroundTaskHistoryStore')
export class BackgroundTaskHistoryStoreTest {
    @Test('put/get round-trips an enriched record')
    async basicRoundTrip() {
        await withStore(async store => {
        await store.put(record({
            id: 'bg-1', sessionId: 'session-a', status: 'completed', goal: 'g', startedAt: 100,
            finishedAt: 200, progress: 1, retryCount: 2, usage: { tokens: 10 }, cause: { kind: 'ok' }
        }));
        const got = await store.get('bg-1');
        expect(got?.status).toEqual('completed');
        expect(got?.progress).toEqual(1);
        expect(got?.retryCount).toEqual(2);
        expect(got?.usage?.tokens).toEqual(10);
        });
    }

    @Test('put idempotently replaces the prior snapshot for the same id')
    async putReplacesById() {
        await withStore(async store => {
        await store.put(record({ id: 'bg-1', sessionId: 'session-a', status: 'running', goal: 'g', startedAt: 100 }));
        await store.put(record({ id: 'bg-1', sessionId: 'session-a', status: 'completed', goal: 'g', startedAt: 100 }));
        const got = await store.get('bg-1');
        expect(got?.status).toEqual('completed');
        expect((await store.pageAll()).items.length).toEqual(1);
        });
    }

    @Test('pageAll is cursor-paged newest first without skipping or duplicating records')
    async cursorPaging() {
        await withStore(async store => {
        // Same timestamp collisions to exercise the startedAt-desc, id-asc tiebreak.
        for (let i = 0; i < 6; i++) {
            await store.put(record({ id: `bg-${i}`, sessionId: 'session-a', status: 'completed', goal: `g${i}`, startedAt: 1000 }));
        }
        const page1 = await store.pageAll({ limit: 4 });
        expect(page1.items.length).toEqual(4);
        expect(page1.hasMore).toEqual(true);
        expect(page1.nextCursor).toBeDefined();

        const page2 = await store.pageAll({ cursor: page1.nextCursor, limit: 4 });
        expect(page2.items.length).toEqual(2);
        expect(page2.hasMore).toEqual(false);
        expect(page2.nextCursor).toBeUndefined();

        const seen = new Set([...page1.items, ...page2.items].map(t => t.id));
        expect(seen.size).toEqual(6);
        expect(seen.has('bg-0')).toEqual(true);
        expect(seen.has('bg-5')).toEqual(true);
        });
    }

    @Test('pageBySession filters to one owner session')
    async pageBySessionFilters() {
        await withStore(async store => {
        await store.put(record({ id: 'bg-a1', sessionId: 'session-a', status: 'completed', goal: 'a', startedAt: 100 }));
        await store.put(record({ id: 'bg-b1', sessionId: 'session-b', status: 'completed', goal: 'b', startedAt: 200 }));
        const page = await store.pageBySession('session-a');
        expect(page.items.map(t => t.id)).toEqual(['bg-a1']);
        });
    }

    @Test('batchCancel cancels only running tasks and returns their ids')
    async batchCancelRunningOnly() {
        await withStore(async store => {
        await store.put(record({ id: 'bg-run', sessionId: 'session-a', status: 'running', goal: 'r', startedAt: 100 }));
        await store.put(record({ id: 'bg-done', sessionId: 'session-a', status: 'completed', goal: 'd', startedAt: 100 }));
        const cancelled = await store.batchCancel(['bg-run', 'bg-done', 'bg-missing']);
        expect(cancelled).toEqual(['bg-run']);
        expect((await store.get('bg-run'))?.status).toEqual('cancelled');
        expect((await store.get('bg-done'))?.status).toEqual('completed');
        });
    }

    @Test('subscribe fires on put and batchCancel, unsubscribe stops delivery')
    async subscribeLifecycle() {
        await withStore(async store => {
        const seen: string[] = [];
        const unsub = store.subscribe(item => seen.push(`${item.id}:${item.status}`));
        await store.put(record({ id: 'bg-1', sessionId: 'session-a', status: 'running', goal: 'g', startedAt: 100 }));
        await store.batchCancel(['bg-1']);
        unsub();
        await store.put(record({ id: 'bg-2', sessionId: 'session-a', status: 'running', goal: 'g', startedAt: 200 }));
        expect(seen).toEqual(['bg-1:running', 'bg-1:cancelled']);
        });
    }

    @Test('cursor decode round-trips stable startedAt/id pairs')
    async cursorEncodeDecode() {
        const raw = { startedAt: 1234567890123, id: 'bg-abc' };
        const cursor = encodeBackgroundTaskCursor(raw);
        const decoded = decodeBackgroundTaskCursor(cursor);
        expect(decoded?.startedAt).toEqual(raw.startedAt);
        expect(decoded?.id).toEqual(raw.id);
        expect(decodeBackgroundTaskCursor(undefined)).toBeUndefined();
        expect(decodeBackgroundTaskCursor('garbage')).toBeUndefined();
    }

    @Test('manager write-through persists enriched records to the history store')
    async managerWriteThrough() {
        await withStore(async store => {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => ({ content: 'done', sessionId: 'worker-1', turnCount: 1, toolCalls: 1, usage: { tokens: 7 } })),
            undefined as any,
            store
        );
        const record = manager.start({ prompt: 'persist me' }, 'session-a');
        expect(record.progress).toEqual(0);
        expect(record.retryCount).toEqual(0);
        expect(record.updatedAt).toBeGreaterThan(0);

        const completed = await manager.wait(record.id, 5000);
        expect(completed.status).toEqual('completed');
        // Poll the async fire-and-forget persist briefly.
        await waitFor(async () => (await store.get(record.id))?.status === 'completed');

        const persisted = await store.get(record.id);
        expect(persisted?.status).toEqual('completed');
        expect(persisted?.progress).toEqual(1);
        expect(persisted?.usage?.tokens).toEqual(7);
        expect(persisted?.sessionId).toEqual('session-a');
        });
    }

    @Test('manager write-through records failure cause')
    async managerFailureCause() {
        await withStore(async store => {
        const manager = new BackgroundTaskManager(
            new RandomUuidGenerator(),
            new ControlledRunner(async () => { throw new Error('boom'); }),
            undefined as any,
            store
        );
        const record = manager.start({ prompt: 'fail me' }, 'session-a');
        const failed = await manager.wait(record.id, 5000);
        expect(failed.status).toEqual('failed');
        await waitFor(async () => (await store.get(record.id))?.status === 'failed');

        const persisted = await store.get(record.id);
        expect(persisted?.error).toContain('boom');
        expect(persisted?.cause?.kind).toEqual('error');
        expect(persisted?.cause?.detail).toContain('boom');
        });
    }
}

async function waitFor(predicate: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
    const startedAt = Date.now();
    for (;;) {
        if (await predicate()) return;
        if (Date.now() - startedAt >= timeoutMs) throw new Error('waitFor timed out');
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}
