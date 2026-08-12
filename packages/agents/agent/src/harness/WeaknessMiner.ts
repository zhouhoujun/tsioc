import { Injectable, Optional } from '@tsdi/ioc';
import { TurnDiagnosticsRecord, TurnDiagnosticsStore } from './TurnDiagnosticsStore';
import { AgentAuditRecord, AuditSink } from './AuditSink';
import { ToolEvidenceEntry } from './EvidenceLedger';
import { HarnessProfile, createDefaultHarnessProfile, deriveGranularCategories, diffHarnessProfiles } from './HarnessProfile';

/**
 * B3: failure-pattern mining (Self-Harness Weakness Mining runtime counterpart).
 *
 * Consumes the durable execution trace — per-turn evidence ledgers persisted on
 * {@link TurnDiagnosticsRecord.evidence} (B1), supplemented by the audit sink —
 * and clusters failures into actionable signals: top failing tools, normalized
 * error-signature clusters, falsified distribution (B2), and candidate harness
 * policy changes (approval / sandbox / verification knobs).
 */

export interface HarnessAuditScope {
    /** Restrict mining to these sessions (empty/undefined = all). */
    sessionIds?: string[];
    /** Only consider evidence/audit created at or after this timestamp. */
    since?: number;
    /** How many top tools / clusters to keep (default 8). */
    topN?: number;
    /** Failure-rate threshold (percentage) above which a tool triggers a suggestion (default 50). */
    failureRateThreshold?: number;
    /** Minimum failures for a tool to trigger a suggestion (default 2). */
    minFailures?: number;
}

export interface HarnessFailureToolStat {
    toolName: string;
    attempts: number;
    failures: number;
    /** Percentage rounded to one decimal place. */
    failureRate: number;
    falsifiedCount: number;
}

export interface HarnessErrorCluster {
    /** Normalized error signature (error code or first line). */
    signature: string;
    count: number;
    /** Up to 3 raw sample error strings. */
    examples: string[];
    /** Distinct tools that produced this signature. */
    toolNames: string[];
    /** Candidate harness policy change when a known pattern is recognized. */
    suggestedPolicy?: string;
}

export interface HarnessFalsifiedStat {
    toolName: string;
    falsifiedCount: number;
    /** Percentage of that tool's evidence entries that were falsified, 0 when no attempts. */
    falsifiedRate: number;
}

export type HarnessSuggestionKind = 'approval' | 'sandbox' | 'verification' | 'tool';

export interface HarnessAuditSuggestion {
    kind: HarnessSuggestionKind;
    toolName?: string;
    message: string;
}

export interface HarnessAuditReport {
    generatedAt: number;
    /** Sessions scoped into this audit; undefined when all sessions were included. */
    scopedSessionIds?: string[];
    totalTurns: number;
    totalToolAttempts: number;
    /** Percentage of turns carrying at least one failed tool evidence entry. */
    failureTurnRate: number;
    topFailingTools: HarnessFailureToolStat[];
    errorClusters: HarnessErrorCluster[];
    falsifiedDistribution: HarnessFalsifiedStat[];
    suggestions: HarnessAuditSuggestion[];
    /** True when there is no evidence and no audit data to mine. */
    empty: boolean;
}

/** Render human-reviewable project rules; callers must explicitly persist them. */
export function buildAgentsRuleDraft(report: HarnessAuditReport): string {
    const lines = ['## Learned Harness Rules', '', '<!-- Generated from verification evidence. Review before merging into AGENTS.md. -->', ''];
    if (!report.suggestions.length && !report.errorClusters.length) {
        lines.push('- No recurring failure patterns were detected.');
        return `${lines.join('\n')}\n`;
    }
    for (const suggestion of report.suggestions) lines.push(`- ${suggestion.message}`);
    for (const cluster of report.errorClusters.filter(cluster => cluster.suggestedPolicy)) {
        lines.push('- Recurring error ' + cluster.signature + ' (' + cluster.count + ' occurrences): ' + cluster.suggestedPolicy + '.');
    }
    lines.push('', 'Review each rule against current project conventions before adding it to AGENTS.md.');
    return `${lines.join('\n')}\n`;
}

const DEFAULT_TOP_N = 8;
const DEFAULT_FAILURE_RATE_THRESHOLD = 50;
const DEFAULT_MIN_FAILURES = 2;

const NETWORK_ERROR_PATTERN = /\b(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|ECONNRESET|EADDRINUSE)\b/;
const SHELL_TOOL_PATTERN = /^(terminal|shell\.|process\.|sudo\.|bash$|sh$|zsh$)/;

/**
 * Normalizes an error string into a stable cluster signature. Well-known
 * error codes (ECONNREFUSED, EACCES, ERR_MODULE_NOT_FOUND, ...) win; otherwise
 * the first line, lower-cased and truncated, becomes the signature.
 */
export function normalizeErrorSignature(error: string | undefined): string {
    const text = String(error ?? '').trim();
    if (!text) {
        return '(unknown error)';
    }
    const codeMatch = text.match(/\b([A-Z][A-Z0-9_]{2,})\b/);
    if (codeMatch && /^(E[A-Z0-9]{2,}|ERR_)/.test(codeMatch[1])) {
        return codeMatch[1];
    }
    return text.split('\n')[0].trim().slice(0, 80).toLowerCase();
}

/**
 * Pure reduction used by both the {@link WeaknessMiner} service and tests.
 * Evidence ledgers are the authoritative tool-level source; when the store
 * holds only legacy records without evidence, audit records are mapped into
 * the same shape so mining still produces a report.
 */
export function mineWeaknesses(
    records: TurnDiagnosticsRecord[],
    auditRecords?: AgentAuditRecord[],
    options?: HarnessAuditScope
): HarnessAuditReport {
    const topN = Number.isFinite(options?.topN) && (options?.topN as number) > 0
        ? Math.floor(options?.topN as number)
        : DEFAULT_TOP_N;
    const failureRateThreshold = Number.isFinite(options?.failureRateThreshold) && (options?.failureRateThreshold as number) >= 0
        ? options?.failureRateThreshold as number
        : DEFAULT_FAILURE_RATE_THRESHOLD;
    const minFailures = Number.isFinite(options?.minFailures) && (options?.minFailures as number) >= 0
        ? Math.floor(options?.minFailures as number)
        : DEFAULT_MIN_FAILURES;

    const since = Number.isFinite(options?.since) ? options?.since as number : undefined;
    const sessionIds = options?.sessionIds && options.sessionIds.length > 0
        ? options.sessionIds
        : undefined;
    let scopedRecords = since ? records.filter(record => record.createdAt >= since) : records;
    let scopedAudit = since ? (auditRecords ?? []).filter(record => record.createdAt >= since) : (auditRecords ?? []);
    if (sessionIds) {
        scopedRecords = scopedRecords.filter(record => sessionIds.includes(record.sessionId));
        scopedAudit = scopedAudit.filter(record => sessionIds.includes(record.sessionId));
    }

    const hasEvidence = scopedRecords.some(record => (record.evidence?.entries?.length ?? 0) > 0);
    const entries: ToolEvidenceEntry[] = [];
    if (hasEvidence) {
        for (const record of scopedRecords) {
            entries.push(...(record.evidence?.entries ?? []));
        }
    } else if (scopedRecords.length > 0 || scopedAudit.length > 0) {
        for (const audit of scopedAudit) {
            entries.push({
                id: audit.id,
                turnId: audit.toolCallId,
                sessionId: audit.sessionId,
                toolName: audit.toolName,
                status: audit.status,
                inputSummary: audit.inputSummary,
                outputSummary: audit.outputSummary,
                exitCode: audit.status === 'error' ? 1 : undefined,
                durationMs: audit.durationMs,
                error: audit.error,
                createdAt: audit.createdAt
            });
        }
    }

    const totalTurns = scopedRecords.length;
    const failures = entries.filter(entry => entry.status === 'error' || (entry.exitCode !== undefined && entry.exitCode !== 0));

    // Per-tool stats.
    const attemptsByTool = new Map<string, number>();
    const failuresByTool = new Map<string, number>();
    const falsifiedByTool = new Map<string, number>();
    for (const entry of entries) {
        attemptsByTool.set(entry.toolName, (attemptsByTool.get(entry.toolName) ?? 0) + 1);
        if (entry.status === 'error' || (entry.exitCode !== undefined && entry.exitCode !== 0)) {
            failuresByTool.set(entry.toolName, (failuresByTool.get(entry.toolName) ?? 0) + 1);
        }
        if (entry.falsified === true) {
            falsifiedByTool.set(entry.toolName, (falsifiedByTool.get(entry.toolName) ?? 0) + 1);
        }
    }
    const toolStats: HarnessFailureToolStat[] = [...attemptsByTool.entries()]
        .map(([toolName, attempts]) => {
            const failures = failuresByTool.get(toolName) ?? 0;
            const falsifiedCount = falsifiedByTool.get(toolName) ?? 0;
            return {
                toolName,
                attempts,
                failures,
                failureRate: attempts > 0 ? Math.round((failures / attempts) * 1000) / 10 : 0,
                falsifiedCount
            };
        })
        .filter(stat => stat.failures > 0)
        .sort((a, b) => b.failures - a.failures || b.failureRate - a.failureRate)
        .slice(0, topN);

    // Error-signature clusters from failed entries.
    const clustersBySignature = new Map<string, { count: number; examples: string[]; toolNames: Set<string> }>();
    for (const entry of failures) {
        const signature = normalizeErrorSignature(entry.error);
        const cluster = clustersBySignature.get(signature) ?? { count: 0, examples: [], toolNames: new Set() };
        cluster.count += 1;
        if (entry.error && cluster.examples.length < 3 && !cluster.examples.includes(entry.error)) {
            cluster.examples.push(entry.error);
        }
        cluster.toolNames.add(entry.toolName);
        clustersBySignature.set(signature, cluster);
    }
    const errorClusters: HarnessErrorCluster[] = [...clustersBySignature.entries()]
        .map(([signature, cluster]) => ({
            signature,
            count: cluster.count,
            examples: cluster.examples,
            toolNames: [...cluster.toolNames],
            suggestedPolicy: NETWORK_ERROR_PATTERN.test(signature)
                ? 'network destination / connectivity — review sandbox.networkAllowlist or outbound access'
                : undefined
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);

    // Falsified distribution (B2 evidence).
    const falsifiedDistribution: HarnessFalsifiedStat[] = [...falsifiedByTool.entries()]
        .map(([toolName, falsifiedCount]) => ({
            toolName,
            falsifiedCount,
            falsifiedRate: (attemptsByTool.get(toolName) ?? 0) > 0
                ? Math.round((falsifiedCount / (attemptsByTool.get(toolName) ?? 0)) * 1000) / 10
                : 0
        }))
        .sort((a, b) => b.falsifiedCount - a.falsifiedCount)
        .slice(0, topN);

    // Candidate harness policy suggestions.
    const suggestions: HarnessAuditSuggestion[] = [];
    for (const stat of toolStats) {
        if (stat.failures >= minFailures && stat.failureRate >= failureRateThreshold) {
            const gated = SHELL_TOOL_PATTERN.test(stat.toolName);
            suggestions.push({
                kind: gated ? 'approval' : 'tool',
                toolName: stat.toolName,
                message: `Tool '${stat.toolName}' failed ${stat.failures}/${stat.attempts} attempts (${stat.failureRate}%). `
                    + (gated
                        ? 'Consider gating it via tools.requireApproval or verifying the sandbox policy for it.'
                        : 'Verify its configuration/availability, or add a checkpoint via tools.requireApproval.')
            });
        }
    }
    for (const [toolName, falsifiedCount] of falsifiedByTool) {
        if (falsifiedCount >= minFailures) {
            suggestions.push({
                kind: 'verification',
                toolName,
                message: `Tool '${toolName}' produced ${falsifiedCount} falsified results. Review verificationWriteTools or strengthen the falsification gate for it.`
            });
        }
    }
    const networkCluster = errorClusters.find(cluster => cluster.suggestedPolicy);
    if (networkCluster && !suggestions.some(suggestion => suggestion.kind === 'sandbox')) {
        suggestions.push({
            kind: 'sandbox',
            message: `Network error cluster '${networkCluster.signature}' (${networkCluster.count} failures). Configure sandbox.networkAllowlist or check outbound connectivity.`
        });
    }
    const failureTurnRate = totalTurns > 0
        ? Math.round((new Set(failures.map(entry => entry.turnId)).size / totalTurns) * 1000) / 10
        : 0;

    return {
        generatedAt: Date.now(),
        scopedSessionIds: options?.sessionIds && options.sessionIds.length > 0 ? options.sessionIds : undefined,
        totalTurns,
        totalToolAttempts: entries.length,
        failureTurnRate,
        topFailingTools: toolStats,
        errorClusters,
        falsifiedDistribution,
        suggestions,
        empty: entries.length === 0 && totalTurns === 0
    };
}

export interface HarnessSuggestionProfilePatch {
    /** Governance profile produced by applying the suggestions. */
    profile: HarnessProfile;
    /** Human-readable governance changes vs the base profile (diffHarnessProfiles lines). */
    changes: string[];
}

/**
 * Fold harness audit suggestions into a versioned HarnessProfile patch
 * (Self-Harness: weakness mining drives the harness's own governance).
 *
 * Mapping: approval/tool suggestions append their tool to requireApproval;
 * sandbox suggestions tighten sandbox mode to 'network-block'; verification
 * suggestions append their tool to verificationWriteTools. Rules are
 * deduplicated and the base profile (or the built-in 'default') is preserved.
 * The returned `changes` are the readable diff lines against the base, so a
 * caller can preview exactly what applying the suggestions would alter.
 */
export function buildSuggestionHarnessProfilePatch(
    suggestions: HarnessAuditSuggestion[],
    base?: HarnessProfile | undefined
): HarnessSuggestionProfilePatch {
    const profile: HarnessProfile = {
        ...(base ?? createDefaultHarnessProfile())
    };
    const approval = new Set<string>();
    for (const rule of profile.requireApproval ?? []) {
        if (typeof rule === 'string') {
            approval.add(rule);
        }
    }
    const writeTools = new Set(profile.verificationWriteTools ?? []);
    for (const suggestion of suggestions) {
        if (suggestion.kind === 'approval' || suggestion.kind === 'tool') {
            if (suggestion.toolName) {
                approval.add(suggestion.toolName);
            }
        }
        if (suggestion.kind === 'sandbox') {
            profile.sandbox = {
                ...(profile.sandbox ?? {}),
                mode: 'network-block'
            };
        }
        if (suggestion.kind === 'verification') {
            if (suggestion.toolName) {
                writeTools.add(suggestion.toolName);
            }
        }
    }
    if (approval.size > 0) {
        profile.requireApproval = [...approval];
    }
    if (writeTools.size > 0) {
        profile.verificationWriteTools = [...writeTools];
    }
    profile.granularCategories = deriveGranularCategories(profile.requireApproval);
    return {
        profile,
        changes: diffHarnessProfiles(base ?? createDefaultHarnessProfile(), profile)
    };
}

/**
 * Injectable service that reads the durable trace (turn diagnostics + audit
 * sink) and produces a {@link HarnessAuditReport}. Scoping to a workspace is
 * expressed as a session-id allowlist by callers (gateway enforces ownership).
 */
@Injectable()
export class WeaknessMiner {
    constructor(
        @Optional() private turnDiagnostics?: TurnDiagnosticsStore | null,
        @Optional() private audit?: AuditSink | null
    ) {
    }

    async mine(options?: HarnessAuditScope): Promise<HarnessAuditReport> {
        const records = this.turnDiagnostics
            ? await this.turnDiagnostics.list()
            : [];
        const auditRecords = this.audit
            ? await this.audit.list()
            : [];
        const sessionIds = options?.sessionIds && options.sessionIds.length > 0
            ? options.sessionIds
            : undefined;
        const scopedRecords = sessionIds
            ? records.filter(record => sessionIds.includes(record.sessionId))
            : records;
        const scopedAudit = sessionIds
            ? auditRecords.filter(record => sessionIds.includes(record.sessionId))
            : auditRecords;
        return mineWeaknesses(scopedRecords, scopedAudit, options);
    }
}
