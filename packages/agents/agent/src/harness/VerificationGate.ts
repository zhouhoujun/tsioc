import { EvidenceLedger, ToolEvidenceEntry } from './EvidenceLedger';

/**
 * Result of a structured falsification pass over the evidence produced in a
 * single tool round (B2).
 */
export interface FalsificationResult {
    falsified: boolean;
    reasons: string[];
    /** Evidence entries that were falsified (copies, safe to persist). */
    falsifiedEvidence: ToolEvidenceEntry[];
}

/**
 * A declared-write hint raised at invocation time when a write tool claimed to
 * change a file but the resolved content is identical to the pre-call state.
 */
export interface WriteFalsificationHint {
    toolName: string;
    filePath: string;
    reason: string;
}

export interface VerificationGateOptions {
    /** Tool names treated as write operations for the declared-vs-actual diff check. */
    writeTools?: string[];
    /** Max evidence entries included in a repair prompt summary. */
    maxEvidenceSummary?: number;
}

/** Default tool names that capture file snapshots and are expected to change file content. */
/** @deprecated Use `AgentPolicyConfig.verification.writeTools` (policy source chain); kept as the schema-default fallback. */
export const DEFAULT_VERIFICATION_WRITE_TOOLS = ['write_file', 'edit_file', 'apply_patch', 'move_file', 'copy_file', 'delete_file', 'mkdir'];

export const DEFAULT_VERIFICATION_MAX_EVIDENCE_SUMMARY = 8;

/**
 * B2: verification gate.
 *
 * Structured falsification checks run at the end of every tool round:
 *  (a) a tool errored or exited non-zero (terminal / lsp_diagnostics /
 *      execute_code failures all surface as error evidence entries);
 *  (b) a declared write produced no actual diff (before === after);
 *  (c) a successful write left error-level (severity 1) LSP diagnostics on
 *      the file(s) it touched;
 *  (d) a P79 verification command (`verification === 'verify-command'`)
 *      exited non-zero or timed out — package typecheck/lint/build/test
 *      failures recorded by the runtime after an edit round.
 *
 * Only evidence recorded since `startIndex` is considered so a previous
 * round's failures are not re-falsified. When falsified, the failing entries
 * are returned so the runtime can mark them (`recordFalsification`) and inject
 * a targeted repair prompt on the next model request.
 */
export class VerificationGate {
    constructor(private readonly options?: VerificationGateOptions) {
    }

    verify(
        ledger: EvidenceLedger | undefined,
        startIndex: number,
        writeHints: WriteFalsificationHint[] = []
    ): FalsificationResult {
        const result: FalsificationResult = { falsified: false, reasons: [], falsifiedEvidence: [] };
        if (!ledger) {
            return result;
        }
        const roundEntries = ledger.entriesFrom(startIndex);

        // (a) tool error / non-zero exit within this round (verify-command handled by (d)).
        for (const entry of roundEntries) {
            if (entry.verification === 'verify-command') {
                continue;
            }
            if (entry.status === 'error' || (entry.exitCode !== undefined && entry.exitCode !== 0)) {
                result.falsified = true;
                result.reasons.push(
                    entry.error
                        ? `Tool "${entry.toolName}" failed: ${entry.error}`
                        : `Tool "${entry.toolName}" exited with code ${entry.exitCode}`
                );
                result.falsifiedEvidence.push({ ...entry });
            }
        }

        // (b) declared writes with no actual diff.
        for (const hint of writeHints) {
            result.falsified = true;
            result.reasons.push(hint.reason);
            const matched = roundEntries.filter(entry => entry.toolName === hint.toolName);
            for (const entry of matched) {
                if (!result.falsifiedEvidence.some(existing => existing.id === entry.id)) {
                    result.falsifiedEvidence.push({ ...entry, falsificationReason: hint.reason });
                }
            }
        }

        // (c) successful writes that left error-level (severity 1) diagnostics.
        for (const entry of roundEntries) {
            if (entry.status !== 'success' || !entry.lspDiagnostics?.length) {
                continue;
            }
            const errors = entry.lspDiagnostics.filter(diagnostic => diagnostic.severity === 1);
            if (!errors.length) {
                continue;
            }
            const pathLabel = errors[0].path ? ` in '${errors[0].path}'` : '';
            const first = errors[0];
            const location = first.startLine !== undefined
                ? ` (line ${first.startLine + 1})`
                : '';
            result.falsified = true;
            result.reasons.push(
                `Tool "${entry.toolName}" left ${errors.length} LSP error(s)${pathLabel}: ${first.message}${location}`
            );
            if (!result.falsifiedEvidence.some(existing => existing.id === entry.id)) {
                result.falsifiedEvidence.push({ ...entry, falsificationReason: `LSP error: ${first.message}` });
            }
        }

        // (d) P79 verification commands that failed (non-zero exit / timeout / spawn error).
        for (const entry of roundEntries) {
            if (entry.verification !== 'verify-command') {
                continue;
            }
            const failed = entry.status !== 'success' || (entry.exitCode !== undefined && entry.exitCode !== 0);
            if (!failed) {
                continue;
            }
            const tail = entry.outputSummary && entry.outputSummary.length > 240
                ? `\n…${entry.outputSummary.slice(-240)}`
                : entry.outputSummary
                    ? `\n${entry.outputSummary}`
                    : '';
            const detail = entry.error
                ? `${entry.error}${entry.exitCode !== undefined ? ` (exit ${entry.exitCode})` : ''}`
                : `exit code ${entry.exitCode ?? 'unknown'}`;
            result.falsified = true;
            result.reasons.push(`Verification command failed: ${detail}${tail}`);
            result.falsifiedEvidence.push({
                ...entry,
                falsificationReason: `Verification command failed: ${detail}`
            });
        }

        return result;
    }
}
