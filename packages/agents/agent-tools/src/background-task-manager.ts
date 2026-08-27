import { ApplicationContext, UuidGenerator } from '@tsdi/core';
import { Inject, Injectable, Optional, token } from '@tsdi/ioc';
import {
    AgentBackgroundTaskCompletedEvent,
    AgentBackgroundTaskFailedEvent,
    AgentBackgroundTaskStartedEvent
} from '@tsdi/agent';

export type BackgroundTaskStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundTaskReport {
    summary?: string;
    diff?: string;
    completed?: string[];
    nextSteps?: string[];
    risks?: string[];
    artifacts?: string[];
}

export interface BackgroundTaskRunRequest {
    prompt: string;
    sessionId?: string;
    toolsets?: string[];
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    maxTurns?: number;
    parentSessionId?: string;
    workerClass?: string;
    profile?: string;
    reasoning?: boolean;
    concurrency?: number;
    secrets?: Record<string, string>;
}

export interface BackgroundTaskRunResult {
    content: string;
    sessionId?: string;
    turnCount: number;
    toolCalls: number;
    model?: string;
    finishReason?: string;
    usage?: Record<string, any>;
    report?: BackgroundTaskReport;
}

export interface BackgroundTaskRunner {
    run(request: BackgroundTaskRunRequest): Promise<BackgroundTaskRunResult>;
}

export interface BackgroundTaskRecord {
    id: string;
    sessionId: string;
    status: BackgroundTaskStatus;
    goal: string;
    startedAt: number;
    finishedAt?: number;
    result?: BackgroundTaskRunResult;
    error?: string;
}

/**
 * DI token for the nested-agent runner used by background tasks. Registered
 * with `useExisting: NestedAgentRunner` by the tools provider; a separate
 * token avoids a load-order cycle with nested-agent-runner.ts.
 */
export const BACKGROUND_TASK_RUNNER = token<BackgroundTaskRunner>('BACKGROUND_TASK_RUNNER');

const MAX_GOAL_CHARS = 200;
const WAIT_POLL_INTERVAL_MS = 100;

function truncateGoal(prompt: string): string {
    const text = prompt.replace(/\s+/g, ' ').trim();
    return text.length > MAX_GOAL_CHARS ? `${text.slice(0, MAX_GOAL_CHARS)}...` : text;
}

/**
 * Fire-and-collect sub-agent execution (G20, P88): starts a nested agent
 * without blocking the current turn, tracks its status, publishes lifecycle
 * events through the application, and lets callers collect the result later.
 */
@Injectable()
export class BackgroundTaskManager {
    private tasks = new Map<string, BackgroundTaskRecord>();
    private waiters = new Set<(record: BackgroundTaskRecord) => void>();
    private listeners = new Set<(record: BackgroundTaskRecord) => void>();

    constructor(
        private uuid: UuidGenerator,
        @Optional() @Inject(BACKGROUND_TASK_RUNNER) private runner?: BackgroundTaskRunner | null,
        @Optional() private app?: ApplicationContext | null
    ) {
    }

    start(request: BackgroundTaskRunRequest, ownerSessionId: string): BackgroundTaskRecord {
        if (!this.runner) {
            throw new Error('BackgroundTaskManager requires a nested agent runner.');
        }
        const id = `bg-${this.uuid.generate()}`;
        const record: BackgroundTaskRecord = {
            id,
            sessionId: ownerSessionId,
            status: 'running',
            goal: truncateGoal(request.prompt),
            startedAt: Date.now()
        };
        this.tasks.set(id, record);
        this.notify(record);
        this.publish(new AgentBackgroundTaskStartedEvent(this, ownerSessionId, id, record.goal));
        void this.runner.run(request).then(
            result => this.finish(id, result),
            err => this.fail(id, err instanceof Error ? err : new Error(String(err)))
        );
        return this.clone(record);
    }

    get(taskId: string): BackgroundTaskRecord | undefined {
        const record = this.tasks.get(taskId);
        return record ? this.clone(record) : undefined;
    }

    list(ownerSessionId: string): BackgroundTaskRecord[] {
        return Array.from(this.tasks.values())
            .filter(record => record.sessionId === ownerSessionId)
            .sort((left, right) => right.startedAt - left.startedAt)
            .map(record => this.clone(record));
    }

    /** Snapshot of tasks across all sessions, newest first. */
    listAll(): BackgroundTaskRecord[] {
        return Array.from(this.tasks.values())
            .sort((left, right) => right.startedAt - left.startedAt)
            .map(record => this.clone(record));
    }

    /** Subscribe to task snapshots. Returns an unsubscribe function. */
    subscribe(listener: (record: BackgroundTaskRecord) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    cancelMany(taskIds: string[]): number {
        return Array.from(new Set(taskIds)).reduce((count, taskId) => count + (this.cancel(taskId) ? 1 : 0), 0);
    }

    cancel(taskId: string): boolean {
        const record = this.tasks.get(taskId);
        if (!record || record.status !== 'running') {
            return false;
        }
        record.status = 'cancelled';
        record.finishedAt = Date.now();
        this.notify(record);
        return true;
    }

    async wait(taskId: string, timeoutMs?: number): Promise<BackgroundTaskRecord> {
        const startedAt = Date.now();
        for (;;) {
            const record = this.tasks.get(taskId);
            if (record && record.status !== 'running') {
                return this.clone(record);
            }
            if (timeoutMs != null && Date.now() - startedAt >= timeoutMs) {
                return record ? this.clone(record) : { id: taskId, sessionId: '', status: 'cancelled' as const, goal: '', startedAt: 0 };
            }
            await new Promise(resolve => setTimeout(resolve, WAIT_POLL_INTERVAL_MS));
        }
    }

    private finish(taskId: string, result: BackgroundTaskRunResult): void {
        const record = this.tasks.get(taskId);
        if (!record || record.status !== 'running') {
            return;
        }
        record.status = 'completed';
        record.finishedAt = Date.now();
        record.result = result;
        this.notify(record);
        this.publish(new AgentBackgroundTaskCompletedEvent(this, record.sessionId, taskId, result.report?.summary ?? this.truncate(result.content)));
    }

    private fail(taskId: string, error: Error): void {
        const record = this.tasks.get(taskId);
        if (!record || record.status !== 'running') {
            return;
        }
        record.status = 'failed';
        record.finishedAt = Date.now();
        record.error = error.message;
        this.notify(record);
        this.publish(new AgentBackgroundTaskFailedEvent(this, record.sessionId, taskId, error));
    }

    private notify(record: BackgroundTaskRecord): void {
        const snapshot = this.clone(record);
        this.waiters.forEach(waiter => {
            try {
                waiter(snapshot);
            } catch {
                return;
            }
        });
        this.listeners.forEach(listener => {
            try {
                listener(snapshot);
            } catch {
                return;
            }
        });
    }

    private publish(event: object): void {
        try {
            this.app?.publishEvent(event as any);
        } catch {
            return;
        }
    }

    private truncate(content: string): string | undefined {
        const text = String(content || '').replace(/\s+/g, ' ').trim();
        return text ? (text.length > MAX_GOAL_CHARS ? `${text.slice(0, MAX_GOAL_CHARS)}...` : text) : undefined;
    }

    private clone(record: BackgroundTaskRecord): BackgroundTaskRecord {
        return {
            ...record,
            ...(record.result ? { result: { ...record.result } } : {})
        };
    }
}
