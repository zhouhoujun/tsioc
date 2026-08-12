import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { AgentAuditRecord, AuditSink } from './AuditSink';
import { InMemoryAuditSink } from './InMemoryAuditSink';
import { lazyTypeOrmAdapters, resolveTypeormAdapter } from '../lazy-typeorm';

@Injectable()
export class DefaultAuditSink extends AuditSink {
    private resolved?: AuditSink;

    constructor(
        @Inject(ApplicationContext) private app: ApplicationContext,
        private fallback: InMemoryAuditSink
    ) {
        super();
    }

    async append(record: AgentAuditRecord): Promise<void> {
        const sink = this.resolveSink();
        await sink.append(record);
    }

    async list(sessionId?: string): Promise<AgentAuditRecord[]> {
        const sink = this.resolveSink();
        return sink.list(sessionId);
    }

    private resolveSink(): AuditSink {
        if (this.resolved) {
            return this.resolved;
        }
        const adapter = resolveTypeormAdapter(this.app);
        this.resolved = adapter ? lazyTypeOrmAdapters.getTypeOrmAuditSink(adapter) : this.fallback;
        return this.resolved;
    }
}
