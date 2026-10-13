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

const LCS_CELL_LIMIT = 4_000_000;
const HUNK_CONTEXT = 3;

/**
 * Ordered, context-aware line diff (LCS based) grouped into `@@` hunks.
 *
 * Unlike {@link simpleLineDiff} — an order-independent set difference that
 * renders removed-then-added lines with no context and is misleading for code
 * edits — this preserves line order and shows surrounding context, so a
 * reviewer (or the model) can read the change as a normal unified diff. Falls
 * back to the set diff for very large inputs to bound memory.
 */
export function unifiedLineDiff(before: string, after: string, context = HUNK_CONTEXT): string {
    const a = before.length ? before.split('\n') : [];
    const b = after.length ? after.split('\n') : [];
    const n = a.length;
    const m = b.length;
    if (n === 0 && m === 0) {
        return '';
    }
    if (n * m > LCS_CELL_LIMIT) {
        return simpleLineDiff(before, after);
    }

    // dp[i][j] = LCS length of a[i..] and b[j..], stored row-major.
    const width = m + 1;
    const dp = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            const equal = a[i] === b[j];
            dp[i * width + j] = equal
                ? dp[(i + 1) * width + (j + 1)] + 1
                : Math.max(dp[(i + 1) * width + j], dp[i * width + (j + 1)]);
        }
    }

    type Op = { type: ' ' | '-' | '+'; line: string };
    const ops: Op[] = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (a[i] === b[j]) {
            ops.push({ type: ' ', line: a[i] });
            i += 1;
            j += 1;
        } else if (dp[(i + 1) * width + j] >= dp[i * width + (j + 1)]) {
            ops.push({ type: '-', line: a[i] });
            i += 1;
        } else {
            ops.push({ type: '+', line: b[j] });
            j += 1;
        }
    }
    while (i < n) {
        ops.push({ type: '-', line: a[i] });
        i += 1;
    }
    while (j < m) {
        ops.push({ type: '+', line: b[j] });
        j += 1;
    }

    const changed = ops.map(op => op.type !== ' ');
    // Line numbers entering each op.
    const aAt = new Array<number>(ops.length);
    const bAt = new Array<number>(ops.length);
    let aLine = 1;
    let bLine = 1;
    for (let k = 0; k < ops.length; k++) {
        aAt[k] = aLine;
        bAt[k] = bLine;
        if (ops[k].type === ' ') { aLine += 1; bLine += 1; }
        else if (ops[k].type === '-') { aLine += 1; }
        else { bLine += 1; }
    }

    const lines: string[] = [];
    let index = 0;
    while (index < ops.length) {
        while (index < ops.length && !changed[index]) {
            index += 1;
        }
        if (index >= ops.length) {
            break;
        }
        const start = Math.max(0, index - context);
        let lastChange = index;
        for (let scan = index + 1; scan < ops.length; scan++) {
            if (!changed[scan]) {
                continue;
            }
            if (scan - lastChange <= 2 * context) {
                lastChange = scan;
            } else {
                break;
            }
        }
        const end = Math.min(ops.length - 1, lastChange + context);
        const slice = ops.slice(start, end + 1);
        const aCount = slice.reduce((sum, op) => sum + (op.type === '+' ? 0 : 1), 0);
        const bCount = slice.reduce((sum, op) => sum + (op.type === '-' ? 0 : 1), 0);
        lines.push(`@@ -${aAt[start]},${aCount} +${bAt[start]},${bCount} @@`);
        for (const op of slice) {
            lines.push(`${op.type}${op.line}`);
        }
        index = end + 1;
    }
    return lines.join('\n');
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
    const body = unifiedLineDiff(before ?? '', after ?? '');
    if (!body) {
        return undefined;
    }
    const full = `--- a/${filePath}\n+++ b/${filePath}\n${body}`;
    return full.length > maxChars ? `${full.slice(0, maxChars)}\n...[diff truncated]` : full;
}
