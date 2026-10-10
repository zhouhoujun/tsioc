// Shared line-level diff rendering for file-change tool results.

const DEFAULT_DIFF_MAX_CHARS = 2000;

function countLines(lines: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const line of lines) {
        counts.set(line, (counts.get(line) || 0) + 1);
    }
    return counts;
}

/** Order-independent line diff: removed lines (`-`) then added lines (`+`). */
export function simpleLineDiff(before: string, after: string): string {
    const beforeCounts = countLines(before.length ? before.split('\n') : []);
    const afterCounts = countLines(after.length ? after.split('\n') : []);
    const removed: string[] = [];
    const added: string[] = [];
    for (const [line, count] of beforeCounts) {
        const remaining = count - (afterCounts.get(line) || 0);
        for (let index = 0; index < remaining; index++) {
            removed.push(`-${line}`);
        }
    }
    for (const [line, count] of afterCounts) {
        const extra = count - (beforeCounts.get(line) || 0);
        for (let index = 0; index < extra; index++) {
            added.push(`+${line}`);
        }
    }
    return [...removed, ...added].join('\n');
}

/**
 * Render a bounded unified diff for a file change, or undefined when the content
 * is unchanged. Exists only when there was a prior version to compare against
 * (new-file writes have no diff); the output is capped so a large rewrite cannot
 * flood the tool result.
 */
export function renderUnifiedDiff(
    filePath: string,
    before: string | null,
    after: string | null,
    maxChars = DEFAULT_DIFF_MAX_CHARS
): string | undefined {
    if (before === after) {
        return undefined;
    }
    const body = simpleLineDiff(before ?? '', after ?? '');
    if (!body) {
        return undefined;
    }
    const full = `--- a/${filePath}\n+++ b/${filePath}\n${body}`;
    return full.length > maxChars ? `${full.slice(0, maxChars)}\n...[diff truncated]` : full;
}
