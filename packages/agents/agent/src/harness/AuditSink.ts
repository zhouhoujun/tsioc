import { Abstract } from '@tsdi/ioc';

export type AgentAuditStatus = 'success' | 'error' | 'skipped';

export interface AgentAuditRecord {
    id: string;
    sessionId: string;
    toolName: string;
    toolCallId: string;
    status: AgentAuditStatus;
    inputSummary?: string;
    outputSummary?: string;
    error?: string;
    durationMs?: number;
    attemptCount?: number;
    principalId?: string;
    createdAt: number;
    metadata?: Record<string, any>;
}

@Abstract()
export abstract class AuditSink {
    abstract append(record: AgentAuditRecord): Promise<void>;
    abstract list(sessionId?: string): Promise<AgentAuditRecord[]>;
}
