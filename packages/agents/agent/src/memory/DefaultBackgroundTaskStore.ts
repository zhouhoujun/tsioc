import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import {
    BackgroundTaskHistoryStore, BackgroundTaskPage, BackgroundTaskPageOptions,
    BackgroundTaskRecord, InMemoryBackgroundTaskHistoryStore
} from './background-task-store';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultBackgroundTaskStore extends BackgroundTaskHistoryStore {
    private resolved?: BackgroundTaskHistoryStore;

    constructor(@Inject(ApplicationContext) private app: ApplicationContext, private fallback: InMemoryBackgroundTaskHistoryStore) {
        super();
    }

    put(record: BackgroundTaskRecord): Promise<void> { return this.store().put(record); }
    get(taskId: string): Promise<BackgroundTaskRecord | undefined> { return this.store().get(taskId); }
    pageAll(options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> { return this.store().pageAll(options); }
    pageBySession(sessionId: string, options?: BackgroundTaskPageOptions): Promise<BackgroundTaskPage> { return this.store().pageBySession(sessionId, options); }
    batchCancel(taskIds: string[]): Promise<string[]> { return this.store().batchCancel(taskIds); }
    subscribe(listener: (record: BackgroundTaskRecord) => void): () => void { return this.store().subscribe(listener); }

    private store(): BackgroundTaskHistoryStore {
        if (this.resolved) return this.resolved;
        const adapter = resolveTypeormAdapter(this.app);
        return this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmBackgroundTaskStore(adapter) : this.fallback;
    }
}
