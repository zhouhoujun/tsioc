import { Inject, Injectable } from '@tsdi/ioc';
import { ApplicationContext } from '@tsdi/core';
import { TypeormAdapter } from '@tsdi/typeorm-adapter';
import { AgentAuditRecord, AuditSink } from './AuditSink';
import { InMemoryAuditSink } from './InMemoryAuditSink';
import { TypeOrmAuditSink } from './TypeOrmAuditSink';

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
        const adapter = this.tryGetAdapter();
        this.resolved = adapter ? new TypeOrmAuditSink(adapter) : this.fallback;
        return this.resolved;
    }

    private tryGetAdapter(): TypeormAdapter | null {
        if (!this.app) {
            return null;
        }
        try {
            return this.app.get(TypeormAdapter, null) as TypeormAdapter | null;
        } catch {
            return null;
        }
    }
}
