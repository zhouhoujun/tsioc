/**
 * Structural scoring for compaction summaries.
 *
 * Unlike semantic review, this scorer is deterministic: it grades the
 * five-field shape (completeness), whether the Files: line separates
 * `modified:` from `mentioned:` paths, field length sanity, and overall
 * truncation. Provider-specific quality can then be compared by aggregating
 * these scores per model provider.
 */
export interface SummaryQualityScore {
    /** Overall 0-100 score, 0 when no summary content is available. */
    total: number;
    /** 0-100: one fifth deducted per missing labeled field. */
    fieldCompleteness: number;
    /** 0-100: Files: line carries both modified/mentioned annotations. */
    annotationQuality: number;
    /** 0-100: field lengths stay within sane bounds. */
    lengthBalance: number;
    /** 0-100: summary stays well under the compose cap. */
    truncationScore: number;
    /** True when the score was computed on a naive fallback summary. */
    fallbackUsed: boolean;
    /** Labels that could not be parsed from the summary. */
    missingFields: string[];
    /** Total summary length in characters. */
    summaryLength: number;
}

const SUMMARY_FIELDS = ['Goal', 'Decisions', 'Files', 'Errors', 'Open state'] as const;
const FIELD_LINE_RE = /^\s*(Goal|Decisions|Files|Errors|Open state)\s*:\s*(.*?)\s*$/i;

/**
 * Score a compaction summary with the structural rubric. `fallbackUsed`
 * applies a 0.7 multiplier to the total to reflect skipped model review.
 */
export function scoreSummaryQuality(
    summary: string | undefined | null,
    options?: { fallbackUsed?: boolean; summaryLength?: number }
): SummaryQualityScore {
    const fallbackUsed = !!options?.fallbackUsed;
    const text = String(summary || '').replace(/\r/g, '');
    const summaryLength = options?.summaryLength ?? text.length;
    if (!text.trim()) {
        return {
            total: 0,
            fieldCompleteness: 0,
            annotationQuality: 0,
            lengthBalance: 0,
            truncationScore: 0,
            fallbackUsed,
            missingFields: [...SUMMARY_FIELDS],
            summaryLength
        };
    }
    const fields = parseSummaryFields(text);
    const missingFields = SUMMARY_FIELDS.filter(label => !fields[label]);

    const fieldCompleteness = Math.max(0, 100 - missingFields.length * 20);
    const annotationQuality = scoreAnnotationQuality(fields.Files);
    const lengthBalance = scoreLengthBalance(fields);
    const truncationScore = scoreTruncation(text.length);

    let total = Math.round(
        fieldCompleteness * 0.4 +
        annotationQuality * 0.2 +
        lengthBalance * 0.2 +
        truncationScore * 0.2
    );
    if (fallbackUsed) {
        total = Math.round(total * 0.7);
    }

    return {
        total,
        fieldCompleteness,
        annotationQuality,
        lengthBalance,
        truncationScore,
        fallbackUsed,
        missingFields,
        summaryLength
    };
}

function parseSummaryFields(text: string): Partial<Record<string, string>> {
    const result: Partial<Record<string, string>> = {};
    let activeLabel: string | undefined;
    for (const line of text.split('\n')) {
        const match = FIELD_LINE_RE.exec(line);
        if (match) {
            activeLabel = match[1];
            result[activeLabel] = match[2].trim();
            continue;
        }
        const trimmed = line.trim();
        if (!trimmed || !activeLabel) {
            continue;
        }
        result[activeLabel] = `${result[activeLabel] ?? ''} ${trimmed}`.trim();
    }
    return result;
}

function scoreAnnotationQuality(filesField: string | undefined): number {
    if (!filesField?.trim()) {
        return 0;
    }
    const hasModified = /(?:^|\b)modified\s*:/.test(filesField);
    const hasMentioned = /(?:^|\b)mentioned\s*:/.test(filesField);
    if (hasModified && hasMentioned) {
        return 100;
    }
    return hasModified || hasMentioned ? 50 : 0;
}

function scoreLengthBalance(fields: Partial<Record<string, string>>): number {
    let score = 100;
    for (const label of SUMMARY_FIELDS) {
        const value = fields[label];
        if (!value) {
            continue;
        }
        if (value.length > 0 && value.length < 15) {
            score -= 10;
        } else if (value.length > 250) {
            score -= 5;
        }
    }
    return Math.max(0, score);
}

function scoreTruncation(length: number): number {
    if (length >= 2000) {
        return 30;
    }
    if (length >= 1500) {
        return 60;
    }
    if (length >= 1000) {
        return 85;
    }
    return 100;
}
