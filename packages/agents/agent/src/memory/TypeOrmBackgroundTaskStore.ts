import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentOptions, defaultAgentOptions } from '../options';
import { AGENT_OPTIONS } from '../tokens';
import { In } from 'typeorm';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentBackgroundTaskEntity } from './entities';
import {
    BackgroundTaskHistoryStore, BackgroundTaskHistoryListener, BackgroundTaskPage,
    BackgroundTaskPageOptions, BackgroundTaskRecord, BackgroundTaskRunResult,
    BackgroundTaskStatus, cloneBackgroundTaskRecord, pageBackgroundTaskRecords
} from './background-task-store';

@Injectable()
export class TypeOrmBackgroundTaskStore extends BackgroundTaskHistoryStore {
    private readonly listeners = new Set<BackgroundTaskHistoryListener>();

    constructor(@Inject(TypeormAdapter) private adapter: TypeormAdapter, @Optional() @Inject(AGENT_OPTIONS) private options?: AgentOptions) {
        super();
    }

    private get repo() {
        return this.adapter.getRepository(AgentBackgroundTaskEntity);
    }

    async put(record: BackgroundTaskRecord): Promise<void> {
        const existing = await this.repo.findOne({ where: { taskId: record.id } as any });
        await this.repo.save(this.repo.create({
            ...(existing ? { rowId: existing.rowId } : {}),
            taskId: record.id,
            sessionId: record.sessionId,
            status: record.status,
            goal: record.goal,
            startedAt: record.startedAt,
            finishedAt: record.finishedAt != null ? record.finishedAt : null,
            updatedAt: record.updatedAt != null ? record.updatedAt : null,
            result: record.result ? record.result : null,
            error: record.error != null ? record.error : null,
            progress: record.progress != null ? record.progress : null,
            retryCount: record.retryCount != null ? record.retryCount : null,
            usage: record.usage ? record.usage : null,
            cause: record.cause ? record.cause : null
        }));
        this.notify(record);
    }

    async get(taskId: string): Promise<BackgroundTaskRecord | undefined> {
        const row = await this.repo.findOne({ where: { taskId } as any });
        return row ? toRecord(row) : undefined;
    }

    async pageAll(options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> {
        const sorted = await this.loadAll(undefined);
        return pageBackgroundTaskRecords(sorted, options, this.options?.policy?.limits?.backgroundTaskPageSize ?? defaultAgentOptions.policy?.limits?.backgroundTaskPageSize);
    }

    async pageBySession(sessionId: string, options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> {
        const sorted = await this.loadAll(sessionId);
        return pageBackgroundTaskRecords(sorted, options, this.options?.policy?.limits?.backgroundTaskPageSize ?? defaultAgentOptions.policy?.limits?.backgroundTaskPageSize);
    }

    async pageBySessions(sessionIds: string[], options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> {
        const sorted = await this.loadAll(sessionIds);
        return pageBackgroundTaskRecords(sorted, options, this.options?.policy?.limits?.backgroundTaskPageSize ?? defaultAgentOptions.policy?.limits?.backgroundTaskPageSize);
    }

    async batchCancel(taskIds: string[]): Promise<string[]> {
        const cancelled: string[] = [];
        for (const taskId of new Set(taskIds)) {
            const row = await this.repo.findOne({ where: { taskId } as any });
            if (row && row.status === 'running') {
                const now = Date.now();
                await this.repo.save(this.repo.create({
                    rowId: row.rowId,
                    taskId: row.taskId,
                    sessionId: row.sessionId,
                    status: 'cancelled',
                    goal: row.goal,
                    startedAt: Number(row.startedAt),
                    finishedAt: now,
                    updatedAt: now,
                    result: row.result,
                    error: row.error,
                    progress: row.progress,
                    retryCount: row.retryCount,
                    usage: row.usage,
                    cause: row.cause
                }));
                const record: BackgroundTaskRecord = toRecord({
                    ...row,
                    status: 'cancelled',
                    finishedAt: now,
                    updatedAt: now
                });
                this.notify(record);
                cancelled.push(taskId);
            }
        }
        return cancelled;
    }

    subscribe(listener: BackgroundTaskHistoryListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private async loadAll(sessionId: string | string[] | undefined): Promise<BackgroundTaskRecord[]> {
        let where: Record<string, unknown> | undefined;
        if (typeof sessionId === 'string' && sessionId) {
            where = { sessionId };
        } else if (Array.isArray(sessionId)) {
            const unique = Array.from(new Set(sessionId.filter(id => Boolean(id && id.trim()))));
            if (!unique.length) {
                return [];
            }
            where = { sessionId: In(unique) };
        }
        const rows = await this.repo.find({
            ...(where ? { where: where as any } : {}),
            order: { startedAt: 'DESC' } as any
        });
        const records = rows.map(toRecord);
        return records.sort(compareDesc);
    }

    private notify(record: BackgroundTaskRecord): void {
        const snapshot = cloneBackgroundTaskRecord(record);
        this.listeners.forEach(listener => {
            try {
                listener(snapshot);
            } catch {
                return;
            }
        });
    }
}

function compareDesc(left: BackgroundTaskRecord, right: BackgroundTaskRecord): number {
    if (right.startedAt !== left.startedAt) {
        return right.startedAt - left.startedAt;
    }
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function toRecord(row: AgentBackgroundTaskEntity): BackgroundTaskRecord {
    return {
        id: row.taskId,
        sessionId: row.sessionId,
        status: row.status as BackgroundTaskStatus,
        goal: row.goal,
        startedAt: Number(row.startedAt),
        finishedAt: row.finishedAt != null ? Number(row.finishedAt) : undefined,
        updatedAt: row.updatedAt != null ? Number(row.updatedAt) : undefined,
        result: row.result ? (row.result as BackgroundTaskRunResult) : undefined,
        error: row.error != null ? row.error : undefined,
        progress: row.progress != null ? row.progress : undefined,
        retryCount: row.retryCount != null ? row.retryCount : undefined,
        usage: row.usage ? row.usage : undefined,
        cause: row.cause ? row.cause : undefined
    };
}
