import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentAuditRecord, AuditSink } from './AuditSink';

export type ReviewFindingCategory = 'correctness' | 'risk' | 'suggestion';

export type ReviewFindingSeverity = 'error' | 'warning' | 'info';

export interface ReviewFindingAnchor {
    file: string;
    line?: number;
    endLine?: number;
}

export interface ReviewFinding {
    id: string;
    category: ReviewFindingCategory;
    severity: ReviewFindingSeverity;
    summary: string;
    detail?: string;
    anchor?: ReviewFindingAnchor;
    suggestion?: string;
}

export interface ReviewRun {
    id: string;
    sessionId: string;
    base: string;
    range?: string;
    paths?: string[];
    commitSha?: string;
    files: string[];
    diffSummary?: string;
    createdAt: number;
    findings: ReviewFinding[];
}

export const REVIEW_AUDIT_TOOL_NAME = 'review_diff';

/**
 * P80: persists structured review findings through the existing audit/evidence
 * pipeline (AuditSink) so findings share the durable audit trail and stay
 * bindable to the reviewed commit. Each run is stored as one synthetic audit
 * record with toolName 'review_diff' and the full run payload in metadata.
 */
@Injectable()
export class ReviewFindingsStore {
    constructor(
        @Optional() @Inject(AuditSink, { defaultValue: null })
        private audit?: AuditSink | null
    ) {
    }

    async save(run: ReviewRun): Promise<ReviewRun> {
        if (!this.audit) {
            throw new Error('ReviewFindingsStore requires an AuditSink.');
        }
        const record: AgentAuditRecord = {
            id: run.id,
            sessionId: run.sessionId,
            toolName: REVIEW_AUDIT_TOOL_NAME,
            toolCallId: `review:${run.id}`,
            status: 'success',
            inputSummary: this.buildInputSummary(run),
            outputSummary: run.diffSummary,
            createdAt: run.createdAt,
            metadata: { reviewRun: run }
        };
        await this.audit.append(record);
        return run;
    }

    async list(sessionId?: string, commitSha?: string): Promise<ReviewRun[]> {
        const records = this.audit ? await this.audit.list(sessionId) : [];
        const runs = records
            .filter(record => record.toolName === REVIEW_AUDIT_TOOL_NAME)
            .map(record => record.metadata?.reviewRun as ReviewRun | undefined)
            .filter((run): run is ReviewRun => !!run && !!run.id);
        const commit = commitSha ? commitSha.trim() : '';
        return commit ? runs.filter(run => run.commitSha === commit) : runs;
    }

    async get(runId: string): Promise<ReviewRun | null> {
        const id = runId.trim();
        if (!id) {
            return null;
        }
        const records = this.audit ? await this.audit.list() : [];
        for (const record of records) {
            if (record.toolName !== REVIEW_AUDIT_TOOL_NAME || record.id !== id) {
                continue;
            }
            const run = record.metadata?.reviewRun as ReviewRun | undefined;
            if (run && run.id === id) {
                return run;
            }
        }
        return null;
    }

    private buildInputSummary(run: ReviewRun): string {
        const target = run.range || run.base || 'HEAD';
        const pathCount = run.paths?.length ? ` (${run.paths.length} paths)` : '';
        return `review ${target}${pathCount}: ${run.files.length} files, ${run.findings.length} findings`;
    }
}
