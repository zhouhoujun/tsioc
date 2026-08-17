import { Injectable } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';
import { AgentRuntime } from '@tsdi/agent';

export type CloudTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface CloudTaskRecord {
    id: string;
    principalId: string;
    sessionId: string;
    prompt: string;
    profile?: string;
    status: CloudTaskStatus;
    createdAt: number;
    updatedAt: number;
    startedAt?: number;
    completedAt?: number;
    appliedAt?: number;
    result?: any;
    error?: string;
}

@Injectable()
export class CloudTaskQueue {
    protected readonly tasks = new Map<string, CloudTaskRecord>();
    protected readonly pending: string[] = [];
    protected running = 0;

    constructor(private runtime: AgentRuntime, private uuid: UuidGenerator) {
    }

    submit(input: { principalId: string; prompt: string; sessionId?: string; profile?: string }): CloudTaskRecord {
        const now = Date.now();
        const id = this.uuid.generate();
        const task: CloudTaskRecord = {
            id,
            principalId: input.principalId,
            sessionId: input.sessionId || `cloud-${id}`,
            prompt: input.prompt,
            profile: input.profile,
            status: 'queued',
            createdAt: now,
            updatedAt: now
        };
        this.tasks.set(id, task);
        this.pending.push(id);
        void Promise.resolve().then(() => this.drain());
        return this.snapshot(task);
    }

    list(principalId: string): CloudTaskRecord[] {
        return Array.from(this.tasks.values())
            .filter(task => task.principalId === principalId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(task => this.snapshot(task));
    }

    get(taskId: string, principalId: string): CloudTaskRecord | undefined {
        const task = this.tasks.get(taskId);
        return task?.principalId === principalId ? this.snapshot(task) : undefined;
    }

    async cancel(taskId: string, principalId: string): Promise<CloudTaskRecord | undefined> {
        const task = this.tasks.get(taskId);
        if (!task || task.principalId !== principalId) return undefined;
        if (task.status === 'queued') {
            task.status = 'cancelled';
            task.updatedAt = task.completedAt = Date.now();
        } else if (task.status === 'running') {
            await this.runtime.cancelTurn(task.sessionId);
            task.status = 'cancelled';
            task.updatedAt = task.completedAt = Date.now();
        }
        return this.snapshot(task);
    }

    apply(taskId: string, principalId: string): CloudTaskRecord | undefined {
        const task = this.tasks.get(taskId);
        if (!task || task.principalId !== principalId || task.status !== 'completed') return undefined;
        task.appliedAt = task.appliedAt || Date.now();
        task.updatedAt = task.appliedAt;
        return this.snapshot(task);
    }

    protected async drain(): Promise<void> {
        while (this.running < 2 && this.pending.length) {
            const id = this.pending.shift()!;
            const task = this.tasks.get(id);
            if (!task || task.status !== 'queued') continue;
            this.running += 1;
            void this.execute(task).finally(() => {
                this.running -= 1;
                void this.drain();
            });
        }
    }

    protected async execute(task: CloudTaskRecord): Promise<void> {
        task.status = 'running';
        task.startedAt = task.updatedAt = Date.now();
        try {
            const turn = await this.runtime.runTurn(task.sessionId, task.prompt, task.principalId, undefined, task.profile);
            if (this.isCancelled(task)) return;
            const messages = await this.runtime.getMessages(task.sessionId);
            task.result = { turn, message: messages[messages.length - 1] || null };
            task.status = 'completed';
        } catch (error: any) {
            if (!this.isCancelled(task)) {
                task.status = 'failed';
                task.error = error?.message || String(error);
            }
        } finally {
            task.completedAt = task.updatedAt = Date.now();
        }
    }

    protected snapshot(task: CloudTaskRecord): CloudTaskRecord {
        return { ...task, result: task.result ? { ...task.result } : undefined };
    }

    protected isCancelled(task: CloudTaskRecord): boolean {
        return task.status === 'cancelled';
    }
}
