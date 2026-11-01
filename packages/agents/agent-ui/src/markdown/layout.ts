import { AgentConsoleMarkdownLine } from './model';

/** Zero-width marker that still reserves one transcript row in DOM and TUI. */
const BLANK_LINE_TOKEN = '\u200b';

type MarkdownBlockKind = 'blank' | 'heading' | 'table' | 'code' | 'hr' | 'quote' | 'list' | 'text';

/** Blocks that get one blank row before and after them (when adjacent to another block). */
const SPACED_BLOCK_KINDS = new Set<MarkdownBlockKind>(['heading', 'table', 'code', 'hr', 'quote']);
const SPACED_BEFORE_KINDS = new Set<MarkdownBlockKind>(['heading', 'table', 'code', 'hr', 'quote', 'list']);

/** Plain text of one rendered line: list/quote prefix plus every token. */
export function flattenAgentConsoleMarkdownLine(line?: AgentConsoleMarkdownLine | null): string {
    if (!line) {
        return '';
    }
    return `${line.prefix || ''}${line.tokens.map(token => token.text).join('')}`;
}

function classifyBlock(line: AgentConsoleMarkdownLine): MarkdownBlockKind {
    const text = flattenAgentConsoleMarkdownLine(line);
    if (!text.trim()) {
        return 'blank';
    }
    if (line.tone === 'heading') {
        return 'heading';
    }
    const raw = String(line.rawText || '');
    if (line.code || /^[╭╰]/.test(text)) {
        return 'code';
    }
    if (/^[┌├└]/.test(raw) || (raw.startsWith('│') && raw.endsWith('│'))) {
        return 'table';
    }
    if (line.tone === 'muted' && /^─+$/.test(text.trim())) {
        return 'hr';
    }
    if (line.tone === 'quote' || line.prefixTone === 'quote') {
        return 'quote';
    }
    if (String(line.prefix || '').trim() !== '' && /(?:^|\s)(?:[•◦▪]|\d+\.|☑|☐)\s$/.test(String(line.prefix || ''))) {
        return 'list';
    }
    return 'text';
}

function emptyMarkdownLine(): AgentConsoleMarkdownLine {
    return { rawText: '', tokens: [] };
}

/**
 * Give block-level Markdown the same vertical rhythm as the web/DOM transcript:
 * headings, tables, fenced code, quotes and rules get one blank row around them
 * even when the authored source omitted it.
 */
function applyMarkdownBlockSpacing(lines: AgentConsoleMarkdownLine[]): AgentConsoleMarkdownLine[] {
    const spaced: AgentConsoleMarkdownLine[] = [];
    lines.forEach((line, index) => {
        const kind = classifyBlock(line);
        const previous = index > 0 ? lines[index - 1] : undefined;
        const previousKind = previous ? classifyBlock(previous) : 'blank';
        if (
            kind !== 'blank'
            && previousKind !== 'blank'
            && previousKind !== kind
            && (SPACED_BEFORE_KINDS.has(kind) || SPACED_BLOCK_KINDS.has(previousKind))
        ) {
            spaced.push(emptyMarkdownLine());
        }
        spaced.push(line);
    });
    return spaced;
}

function compactMarkdownLines(lines: AgentConsoleMarkdownLine[]): AgentConsoleMarkdownLine[] {
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

function finalizeLineTokens(line: AgentConsoleMarkdownLine): AgentConsoleMarkdownLine {
    if (!flattenAgentConsoleMarkdownLine(line).trim()) {
        return { ...line, tokens: [{ text: BLANK_LINE_TOKEN }] };
    }
    return line;
}

/**
 * Shared post-processing for the structured Markdown document:
 * compact authored blank lines, restore block rhythm, keep inline spaces, and
 * make blank rows visible to both renderers.
 */
export function finalizeAgentConsoleMarkdownLines(
    lines: AgentConsoleMarkdownLine[],
    options: { compactBlankLines?: boolean } = {}
): AgentConsoleMarkdownLine[] {
    const compacted = options.compactBlankLines ? compactMarkdownLines(lines) : lines;
    return applyMarkdownBlockSpacing(compacted).map(finalizeLineTokens);
}
