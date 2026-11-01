import type { AgentConsoleMarkdownLine } from './model';

/** Zero-width marker: reserves a blank transcript row without visible glyphs. */
const BLOCK_BLANK_MARKER = '\u200b';

type MarkdownBlockKind = 'blank' | 'heading' | 'table' | 'code' | 'rule' | 'quote' | 'list' | 'text';

/** Blocks that get one blank row before and after, message-body only. */
const SPACED_KINDS = new Set<MarkdownBlockKind>(['heading', 'table', 'code', 'rule', 'quote', 'list']);
const SPACED_BEFORE = new Set<MarkdownBlockKind>(['heading', 'table', 'code', 'rule', 'quote', 'list']);

/** Plain text of one rendered line: list/quote prefix plus every token. */
export function flattenAgentConsoleMarkdownLine(line?: AgentConsoleMarkdownLine | null): string {
    if (!line) {
        return '';
    }
    return `${line.prefix || ''}${line.tokens.map(token => token.text).join('')}`;
}

function classifyBlock(line: AgentConsoleMarkdownLine): MarkdownBlockKind {
    const text = flattenAgentConsoleMarkdownLine(line);
    if (!text.replace(/\u200b/g, '').trim()) {
        return 'blank';
    }
    const raw = String(line.rawText || '');
    if (line.tone === 'heading') {
        return 'heading';
    }
    if (line.code || /^[╭╰]/.test(text)) {
        return 'code';
    }
    if (/^[┌├└]/.test(raw) || (raw.startsWith('│') && raw.endsWith('│'))) {
        return 'table';
    }
    if (line.tone === 'muted' && /^─+$/.test(text.trim())) {
        return 'rule';
    }
    if (line.tone === 'quote' || line.prefixTone === 'quote') {
        return 'quote';
    }
    if (/(?:^|\s)(?:[•◦▪]|\d+\.|☑|☐)\s$/.test(String(line.prefix || ''))) {
        return 'list';
    }
    return 'text';
}

/**
 * Give Markdown message bodies the same vertical rhythm as the web transcript:
 * headings, tables, fenced code, quotes and rules get one blank row around them
 * even when the authored source omitted it.
 *
 * Only non-compact (message) parses call this; timeline event rows stay compact,
 * so the timeline itself never gains or loses rows here.
 */
export function applyMarkdownBlockSpacing(lines: AgentConsoleMarkdownLine[]): AgentConsoleMarkdownLine[] {
    const spaced: AgentConsoleMarkdownLine[] = [];
    lines.forEach((line, index) => {
        const kind = classifyBlock(line);
        const previous = index > 0 ? lines[index - 1] : undefined;
        const previousKind = previous ? classifyBlock(previous) : 'blank';
        if (kind === 'blank') {
            // Author blank runs collapse to exactly one rhythm row; the first
            // one is kept only for empty content (trimmed for real documents).
            if (spaced.length && classifyBlock(spaced[spaced.length - 1]) === 'blank') {
                return;
            }
            spaced.push({ rawText: '', tokens: [{ text: BLOCK_BLANK_MARKER }] });
            return;
        }
        if (previousKind !== 'blank' && previousKind !== kind
            && (SPACED_BEFORE.has(kind) || SPACED_KINDS.has(previousKind))) {
            spaced.push({ rawText: '', tokens: [{ text: BLOCK_BLANK_MARKER }] });
        }
        spaced.push(line);
    });
    // Keep a lone blank line for empty content (callers rely on one rendered row);
    // otherwise trim the outer blank rows so messages do not start/end with air.
    if (spaced.some(line => classifyBlock(line) !== 'blank')) {
        while (spaced.length && classifyBlock(spaced[0]) === 'blank') {
            spaced.shift();
        }
        while (spaced.length && classifyBlock(spaced[spaced.length - 1]) === 'blank') {
            spaced.pop();
        }
    }
    return spaced;
}


/** Collapse authored blank lines and trim the leading/trailing ones (timeline rows). */
export function compactMarkdownLines(lines: AgentConsoleMarkdownLine[]): AgentConsoleMarkdownLine[] {
    const normalized: AgentConsoleMarkdownLine[] = [];
    lines.forEach(line => {
        const text = flattenAgentConsoleMarkdownLine(line).trim();
        if (/^(?:\d+\.|[-*+]|[•◦▪])$/.test(text)) {
            return;
        }
        if (!text && (!normalized.length || !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim())) {
            return;
        }
        normalized.push(line);
    });
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[0]).trim()) {
        normalized.shift();
    }
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim()) {
        normalized.pop();
    }
    return normalized;
}

/** Plain-text rows (raw mode / user / plan): no Markdown parsing, optional compaction. */
export function renderAgentConsolePlainTextLines(
    content: string,
    options: { compactBlankLines?: boolean } = {}
): AgentConsoleMarkdownLine[] {
    const lines = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(rawText => ({
            rawText,
            tokens: rawText ? [{ text: rawText }] : []
        }));
    if (!options.compactBlankLines) {
        return lines;
    }
    const normalized: AgentConsoleMarkdownLine[] = [];
    lines.forEach(line => {
        const text = flattenAgentConsoleMarkdownLine(line).trim();
        if (!text && (!normalized.length || !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim())) {
            return;
        }
        normalized.push(line);
    });
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[0]).trim()) {
        normalized.shift();
    }
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim()) {
        normalized.pop();
    }
    return normalized;
}
