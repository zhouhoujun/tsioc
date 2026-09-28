import { UuidGenerator } from '@tsdi/core';

/**
 * One normalized evidence entry for a single tool invocation within a turn.
 *
 * Derived from the tool execution receipt plus exit-code / claim signals so
 * downstream consumers (verification gate, weakness mining, uncertainty
 * calibration) can work against a flat, durable shape without replaying
 * session transcripts.
 */
export interface ToolEvidenceEntry {
    id: string;
    turnId: string;
    sessionId: string;
    toolName: string;
    status: 'success' | 'error' | 'skipped';
    /** True when the tool only reads state, so its failure is a probe result, not a false claim. */
    readOnly?: boolean;
    inputSummary?: string;
    outputSummary?: string;
    exitCode?: number;
    durationMs?: number;
    error?: string;
    /**
     * P227: deterministic association to a plan step. When the executing turn
     * attributes this tool invocation to a specific plan step (e.g. the model
     * tags its tool call with `stepId`, or the tool input carries a `stepId`),
     * the value is carried through so the plan execution reconciler can map
     * evidence to a step without guesswork. Absent value falls back to the
     * session's in-progress step.
     */
    stepId?: string;
    /** LSP diagnostics reported for the file(s) touched by a write tool. */
    lspDiagnostics?: Array<{
        path?: string;
        message: string;
        severity?: number;
        code?: string | number;
        source?: string;
        startLine?: number;
        endLine?: number;
    }>;
    /** Set by the verification gate (B2) when this claim was falsified. */
    falsified?: boolean;
    falsificationReason?: string;
    /** Marker for P79 verification-command evidence ('verify-command'). */
    verification?: string;
    createdAt: number;
}

/**
 * Per-turn aggregate of {@link ToolEvidenceEntry}, persisted on
 * {@link TurnDiagnosticsRecord.evidence} so B3 weakness mining and B6
 * uncertainty calibration can consume cross-session execution traces.
 */
export interface EvidenceLedgerSnapshot {
    turnId: string;
    sessionId: string;
    entries: ToolEvidenceEntry[];
    successCount: number;
    errorCount: number;
    skippedCount: number;
    falsifiedCount: number;
    totalDurationMs: number;
    createdAt: number;
}

/** Input shape for {@link EvidenceLedger.record}; identity/timestamps are filled by the ledger. */
export type ToolEvidenceInput = Omit<ToolEvidenceEntry, 'id' | 'turnId' | 'sessionId' | 'createdAt'>;

/**
 * B1: per-turn evidence ledger.
 *
 * Collects one normalized entry per tool invocation and produces a durable
 * aggregate snapshot at turn end. The snapshot is attached to the turn
 * diagnostics record so the harness can later verify claims against evidence
 * (B2) and mine recurring weakness clusters (B3).
 */
export class EvidenceLedger {
    private readonly entries: ToolEvidenceEntry[] = [];
    readonly turnId: string;

    constructor(
        private readonly sessionId: string,
        private readonly uuid: UuidGenerator,
        turnId?: string
    ) {
        this.turnId = turnId ?? this.uuid.generate();
    }

    record(entry: ToolEvidenceInput): ToolEvidenceEntry {
        const normalized: ToolEvidenceEntry = {
            id: this.uuid.generate(),
            turnId: this.turnId,
            sessionId: this.sessionId,
            toolName: entry.toolName,
            status: entry.status,
            readOnly: entry.readOnly,
            inputSummary: entry.inputSummary,
            outputSummary: entry.outputSummary,
            exitCode: entry.exitCode,
            durationMs: entry.durationMs,
            error: entry.error,
            stepId: entry.stepId,
            lspDiagnostics: entry.lspDiagnostics,
            falsified: entry.falsified,
            falsificationReason: entry.falsificationReason,
            verification: entry.verification,
            createdAt: Date.now()
        };
        this.entries.push(normalized);
        return normalized;
    }

    get size(): number {
        return this.entries.length;
    }

    /**
     * Read-only copies of entries recorded from `startIndex` onward. The
     * verification gate (B2) uses this to scope falsification checks to the
     * current round only, so earlier failures are not re-falsified.
     */
    entriesFrom(startIndex: number): ToolEvidenceEntry[] {
        return startIndex <= 0
            ? this.entries.map(entry => ({ ...entry }))
            : this.entries.slice(startIndex).map(entry => ({ ...entry }));
    }

    /**
     * Mark recorded entries as falsified (B2 recordFalsification). Entries
     * whose id is not in `entryIds` are left untouched; the snapshot produced
     * at turn end reflects the falsified flags.
     */
    markFalsified(entryIds: string[], reason: string): void {
        for (const entry of this.entries) {
            if (entryIds.includes(entry.id)) {
                entry.falsified = true;
                entry.falsificationReason = reason;
            }
        }
    }

    /** Immutable per-turn aggregate snapshot. */
    snapshot(): EvidenceLedgerSnapshot {
        const successCount = this.entries.filter(entry => entry.status === 'success').length;
        const errorCount = this.entries.filter(entry => entry.status === 'error').length;
        const skippedCount = this.entries.filter(entry => entry.status === 'skipped').length;
        const falsifiedCount = this.entries.filter(entry => entry.falsified === true).length;
        return {
            turnId: this.turnId,
            sessionId: this.sessionId,
            entries: this.entries.map(entry => ({ ...entry })),
            successCount,
            errorCount,
            skippedCount,
            falsifiedCount,
            totalDurationMs: this.entries.reduce((sum, entry) => sum + (entry.durationMs ?? 0), 0),
            createdAt: Date.now()
        };
    }
}
