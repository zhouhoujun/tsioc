export interface EditMatch {
    search: string;
    occurrences: number;
}

function countOccurrences(content: string, search: string): number {
    if (!search) {
        return 0;
    }
    let count = 0;
    let index = 0;
    while ((index = content.indexOf(search, index)) !== -1) {
        count += 1;
        index += search.length;
    }
    return count;
}

function* lineTrimmedCandidates(content: string, find: string): Generator<string> {
    const findLines = find.split('\n');
    const contentLines = content.split('\n');
    for (let i = 0; i + findLines.length <= contentLines.length; i++) {
        let matched = true;
        for (let j = 0; j < findLines.length; j++) {
            if (contentLines[i + j].trim() !== findLines[j].trim()) {
                matched = false;
                break;
            }
        }
        if (matched) {
            yield contentLines.slice(i, i + findLines.length).join('\n');
        }
    }
}

function* trimmedBoundaryCandidates(content: string, find: string): Generator<string> {
    const trimmed = find.trim();
    if (trimmed && trimmed !== find && content.includes(trimmed)) {
        yield trimmed;
    }
}

/**
 * Strip the `<line>: ` prefixes that `read_file` adds, but only when the text
 * is unambiguously numbered: every line carries a number and the numbers are
 * strictly sequential. This lets a model copy a block straight out of a read
 * result into `oldString`/`newString` without corrupting the target, while a
 * literal string that merely starts with `12: ` is left untouched.
 */
export function stripLineNumberPrefixes(text: string): string {
    const lines = text.split('\n');
    if (!lines.length) {
        return text;
    }
    const numbers: number[] = [];
    for (const line of lines) {
        const match = /^\s*(\d+):\s?/.exec(line);
        if (!match) {
            return text;
        }
        numbers.push(Number(match[1]));
    }
    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] !== numbers[i - 1] + 1) {
            return text;
        }
    }
    return lines.map(line => line.replace(/^\s*\d+:\s?/, '')).join('\n');
}

/**
 * Resolve the text to replace. Exact matches win; when the literal oldString is
 * missing (common when a model re-indents a block), fall back to
 * whitespace-tolerant candidates that are still real substrings of the content,
 * so an edit never fabricates text that does not exist in the file. Mirrors
 * opencode's Replacer cascade (simple -> line-trimmed -> trimmed boundary).
 */
export function resolveEditMatch(content: string, find: string): EditMatch | null {
    const exact = countOccurrences(content, find);
    if (exact > 0) {
        return { search: find, occurrences: exact };
    }
    for (const candidates of [lineTrimmedCandidates, trimmedBoundaryCandidates]) {
        for (const candidate of candidates(content, find)) {
            const occurrences = countOccurrences(content, candidate);
            if (occurrences > 0) {
                return { search: candidate, occurrences };
            }
        }
    }
    return null;
}
