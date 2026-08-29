import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { InMemoryTimelineHistoryStore, TimelineEventRecord, TimelineHistoryStore, TimelineNoncePage, TimelinePageOptions } from './timeline-projection';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultTimelineHistoryStore extends TimelineHistoryStore {
    private resolved?: TimelineHistoryStore;
    constructor(@Inject(ApplicationContext) private app: ApplicationContext, private fallback: InMemoryTimelineHistoryStore) { super(); }
    append(event: Omit<TimelineEventRecord, 'seq'>) { return this.store().append(event); }
    get(sessionId: string) { return this.store().get(sessionId); }
    replay(sessionId: string, sinceSeq?: number) { return this.store().replay(sessionId, sinceSeq); }
    query(sessionId: string, options?: TimelinePageOptions) { return this.store().query(sessionId, options); }
    private store(): TimelineHistoryStore { if (this.resolved) return this.resolved; const adapter = resolveTypeormAdapter(this.app); return this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmTimelineHistoryStore(adapter) : this.fallback; }
}