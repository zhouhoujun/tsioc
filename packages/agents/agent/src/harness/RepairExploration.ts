import { ToolEvidenceEntry } from './EvidenceLedger';

/**
 * One falsified tool round accumulated for exploration context (P53).
 *
 * Unlike `falsifiedEvidence` (which the runtime overwrites with the latest
 * round only), the attempt history is append-only so the repair prompt can
 * present the full exploration path: every approach the model already tried
 * and the verification gate rejected.
 */
export interface FalsificationAttempt {
    /** 1-based attempt ordinal within the turn. */
    round: number;
    /** Falsified evidence copies from this round (safe to persist). */
    entries: ToolEvidenceEntry[];
    /** Repeat-detection signatures derived from this round's entries. */
    signatures: string[];
    /** Falsification reasons collected by the verification gate. */
    reasons: string[];
}

export interface RepairPromptOptions {
    /** Max evidence entries rendered per attempt. Default 4. */
    maxEvidencePerAttempt?: number;
    /** Max attempts rendered in the summary. Default 8. */
    maxAttempts?: number;
}

export const DEFAULT_REPAIR_MAX_EVIDENCE_PER_ATTEMPT = 4;
export const DEFAULT_REPAIR_MAX_ATTEMPTS = 8;

/**
 * Normalize a tool + input pair into a repeat-detection signature.
 *
 * "Same tool, same (normalized) input" is treated as a repeated attempt so the
 * exploration loop can call it out explicitly instead of silently letting the
 * model retry the exact call the verification gate already rejected.
 */
export function buildAttemptSignature(toolName: string, inputSummary?: string): string {
    const input = (inputSummary ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    return `${toolName}::${input.slice(0, 200)}`;
}

/** Strategy categories the exploration directive offers the model. */
export const EXPLORATION_STRATEGY_CATEGORIES = [
    'diagnose first: run read-only inspection to understand the failure before changing anything',
    'different tool: switch to an alternative tool that achieves the same goal',
    'different path: change the input substantially instead of retrying the same call',
    'declare blocked: if no alternative exists, state clearly that you are blocked and why'
] as const;

function entryReason(entry: ToolEvidenceEntry): string {
    return entry.falsificationReason ?? entry.error ?? 'failed';
}

/**
 * Whether the entry's signature first appeared in an earlier attempt.
 * Returns the earlier attempt's round number, or undefined when this is the
 * first time the signature is seen.
 */
function firstSeenRound(attempts: FalsificationAttempt[], entry: ToolEvidenceEntry): number | undefined {
    const signature = buildAttemptSignature(entry.toolName, entry.inputSummary);
    for (const attempt of attempts) {
        if (attempt.signatures.includes(signature)) {
            return attempt.round;
        }
    }
    return undefined;
}

/**
 * Cumulative repair prompt (P53).
 *
 * Lists every falsified attempt — not just the latest round — with numbered
 * attempts and explicit "repeated attempt" annotations, plus a per-tool count
 * of rejected approaches so the model cannot repeat what already failed.
 */
export function buildRepairPrompt(attempts: FalsificationAttempt[], repeatAttempts: number, options?: RepairPromptOptions): string {
    const maxPerAttempt = options?.maxEvidencePerAttempt ?? DEFAULT_REPAIR_MAX_EVIDENCE_PER_ATTEMPT;
    const maxAttempts = options?.maxAttempts ?? DEFAULT_REPAIR_MAX_ATTEMPTS;
    const visible = attempts.slice(-maxAttempts);
    const lines: string[] = [];

    if (visible.length === 0) {
        return 'The verification gate falsified the previous tool results.\nFix the underlying issue and retry with a different approach. If the issue cannot be fixed, state clearly that you are blocked and explain why.';
    }

    lines.push(`The verification gate falsified the previous tool results across ${attempts.length} attempt(s):`);
    for (const attempt of visible) {
        lines.push(`Attempt ${attempt.round}:`);
        const capped = attempt.entries.slice(0, maxPerAttempt);
        for (const entry of capped) {
            const repeatOf = firstSeenRound(attempts, entry);
            const repeatNote = repeatOf !== undefined && repeatOf < attempt.round
                ? ` (repeated attempt — same tool and input as Attempt ${repeatOf})`
                : '';
            lines.push(`- Tool "${entry.toolName}": ${entryReason(entry)}${repeatNote}`);
        }
        const overflow = attempt.entries.length - capped.length;
        if (overflow > 0) {
            lines.push(`- ... and ${overflow} more`);
        }
    }

    // Per-tool rejected count across all attempts (dedup per attempt round).
    const rejectedCounts = new Map<string, number>();
    for (const attempt of visible) {
        const seenInAttempt = new Set<string>();
        for (const entry of attempt.entries) {
            if (!seenInAttempt.has(entry.toolName)) {
                seenInAttempt.add(entry.toolName);
                rejectedCounts.set(entry.toolName, (rejectedCounts.get(entry.toolName) ?? 0) + 1);
            }
        }
    }
    const rejectedSummary = [...rejectedCounts.entries()]
        .map(([tool, count]) => `${tool} (${count}x)`)
        .join(', ');

    if (rejectedSummary) {
        lines.push(`Previously attempted and rejected: ${rejectedSummary}`);
    }

    const repeatWarning = repeatAttempts > 0
        ? ` You repeated ${repeatAttempts} already-rejected call(s).`
        : '';
    lines.push(
        'Fix the underlying issue and retry with a genuinely different approach. Do not repeat the attempts listed above.' +
        `${repeatWarning} If the obvious fixes already failed, gather more diagnostics before writing again, or switch to a different tool/path.` +
        ' If you cannot make progress, state clearly that you are blocked and explain why.'
    );
    return lines.join('\n');
}

/**
 * Exploration directive (P53) — injected when falsification escalates because
 * the model either failed repeatedly (`consecutiveFalsifications >= 2`) or
 * retried an already-rejected call. Distinct from the doom-loop prompt (which
 * fires on repeating tool calls without errors): this one is evidence-driven
 * and enumerates exactly what was rejected before demanding a new strategy.
 */
export function buildExplorationGuidancePrompt(attempts: FalsificationAttempt[]): string {
    const lines: string[] = ['You have repeatedly failed with similar tool attempts. Approaches already tried and rejected:'];
    const visible = attempts.slice(-(DEFAULT_REPAIR_MAX_ATTEMPTS));
    if (visible.length === 0) {
        lines.push('- No specific evidence recorded.');
    }
    for (const attempt of visible) {
        const capped = attempt.entries.slice(0, DEFAULT_REPAIR_MAX_EVIDENCE_PER_ATTEMPT);
        for (const entry of capped) {
            const repeatOf = firstSeenRound(attempts, entry);
            const repeatNote = repeatOf !== undefined && repeatOf < attempt.round
                ? ` (repeat of Attempt ${repeatOf})`
                : '';
            lines.push(`- Attempt ${attempt.round}: Tool "${entry.toolName}" → ${entryReason(entry)}${repeatNote}`);
        }
    }
    lines.push(
        'Pick a strategy category you have NOT tried yet:',
        ...EXPLORATION_STRATEGY_CATEGORIES.map(category => `- ${category}`),
        'Do not reuse the attempts listed above. If no strategy can make progress, state clearly that you are blocked and explain why.'
    );
    return lines.join('\n');
}
