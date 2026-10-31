import { CommonSyntaxState, tokenizeCommonCodeLine } from '@tsdi/components/common';
import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';
export type AgentConsoleMarkdownTone =
    | 'default'
    | 'muted'
    | 'accent'
    | 'strong'
    | 'code'
    | 'inline-code'
    | 'link'
    | 'heading'
    | 'quote'
    | 'emphasis'
    | 'strike'
    | 'syntax-keyword'
    | 'syntax-string'
    | 'syntax-number'
    | 'syntax-comment'
    | 'syntax-property'
    | 'syntax-type'
    | 'syntax-constant'
    | 'syntax-variable'
    | 'syntax-tag'
    | 'syntax-attribute'
    | 'syntax-function';

export interface AgentConsoleMarkdownToken {
    text: string;
    tone?: AgentConsoleMarkdownTone;
}

export interface AgentConsoleMarkdownLine {
    rawText: string;
    prefix?: string;
    prefixTone?: AgentConsoleMarkdownTone;
    tokens: AgentConsoleMarkdownToken[];
    tone?: AgentConsoleMarkdownTone;
    code?: boolean;
}

export interface AgentConsoleMarkdownRenderOptions {
    compactBlankLines?: boolean;
    preserveFenceMarkers?: boolean;
    /** Render the body of an unclosed ``` fence as plain text instead of code lines. */
    treatUnclosedFenceAsText?: boolean;
    /** Column budget for grid tables (defaults to the shared 96-column fallback). */
    tableWidth?: number;
}

const INLINE_MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|(?<![A-Za-z0-9\u4e00-\u9fff])__([^_]+)__(?![A-Za-z0-9\u4e00-\u9fff])|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|(?<![A-Za-z0-9\u4e00-\u9fff])_([^_]+)_(?![A-Za-z0-9\u4e00-\u9fff])/g;
const STANDALONE_STRONG_HEADING_RE = /^\s*(?:\*\*|__)([^*_`][^`]*?)(?:\*\*|__)\s*$/;
const SHORT_HEADING_RE = /^(\s*)([^:：\n]{1,36})([:：])\s*$/;

const DEFAULT_TABLE_WIDTH = 96;
const TABLE_CELL_PADDING_X = 1; const TABLE_MIN_COLUMN_WIDTH = 3;

type MarkdownTableAlign = 'left' | 'center' | 'right';

const SYNTAX_TONES = {
    keyword: 'syntax-keyword',
    string: 'syntax-string',
    number: 'syntax-number',
    comment: 'syntax-comment',
    property: 'syntax-property',
    type: 'syntax-type',
    constant: 'syntax-constant',
    variable: 'syntax-variable',
    tag: 'syntax-tag',
    attribute: 'syntax-attribute',
    function: 'syntax-function'
} as const;

export function renderAgentConsoleMarkdownLines(
    content: string,
    options: AgentConsoleMarkdownRenderOptions = {}
): AgentConsoleMarkdownLine[] {
    const normalizedContent = normalizeMarkdownStructure(content);
    const sourceLines = String(normalizedContent || '').replace(/\r/g, '').split('\n');
    const rendered: AgentConsoleMarkdownLine[] = [];
    const tableWidth = Math.max(24, Math.floor(Number(options.tableWidth) || DEFAULT_TABLE_WIDTH));
    const codeState: CommonSyntaxState = {};
    let inFence = false;
    let fenceLanguage = '';
    let unclosedFenceStart = -1;
    let unclosedFenceRenderStart = -1;

    for (let sourceIndex = 0; sourceIndex < sourceLines.length; sourceIndex++) {
        const sourceLine = sourceLines[sourceIndex];
        const trimmed = sourceLine.trim();
        if (trimmed.startsWith('```')) {
            if (!inFence && options.treatUnclosedFenceAsText && unclosedFenceStart < 0) {
                unclosedFenceStart = sourceIndex;
                unclosedFenceRenderStart = rendered.length;
            }
            if (options.preserveFenceMarkers) {
                rendered.push({
                    rawText: sourceLine,
                    tokens: sourceLine ? [{ text: sourceLine, tone: 'muted' }] : [],
                    tone: 'muted'
                });
            }
            if (!inFence) {
                if (!options.preserveFenceMarkers) {
                    rendered.push(renderCodeFenceHeader(trimmed.slice(3).trim()));
                }
                fenceLanguage = trimmed.slice(3).trim().toLowerCase();
                resetCommonSyntaxState(codeState);
            } else if (!options.preserveFenceMarkers) {
                rendered.push(renderCodeFenceFooter());
                fenceLanguage = '';
            }
            inFence = !inFence;
            if (!inFence) {
                unclosedFenceStart = -1;
                unclosedFenceRenderStart = -1;
            }
            continue;
        }

        if (inFence) {
            rendered.push({
                rawText: sourceLine,
                prefix: sourceLine ? '│ ' : '',
                prefixTone: 'muted',
                tokens: sourceLine ? renderCodeLineTokens(sourceLine, fenceLanguage, codeState) : [],
                tone: 'code',
                code: true
            });
            continue;
        }

        const headerCells = splitMarkdownTableRow(sourceLine);
        const delimiterCells = splitMarkdownTableRow(sourceLines[sourceIndex + 1] || '');
        if (isMarkdownTableHeader(sourceLine, headerCells, delimiterCells)) {
            const rows: string[][] = [];
            let rowIndex = sourceIndex + 2;
            while (rowIndex < sourceLines.length) {
                const rowLine = sourceLines[rowIndex];
                if (!rowLine.trim() || !rowLine.includes('|') || rowLine.trim().startsWith('```')) {
                    break;
                }
                rows.push(splitMarkdownTableRow(rowLine));
                rowIndex += 1;
            }
            rendered.push(...renderMarkdownTable(headerCells, delimiterCells, rows, tableWidth));
            sourceIndex = rowIndex - 1;
            continue;
        }

        rendered.push(renderAgentConsoleMarkdownTextLine(sourceLine, tableWidth));
    }

    if (unclosedFenceRenderStart >= 0 && options.treatUnclosedFenceAsText) {
        const unclosedSection = sourceLines.slice(unclosedFenceStart);
        rendered.splice(
            unclosedFenceRenderStart,
            rendered.length - unclosedFenceRenderStart,
            ...unclosedSection.map(sourceLine => renderAgentConsoleMarkdownTextLine(sourceLine, tableWidth))
        );
    }

    return options.compactBlankLines ? compactMarkdownLines(rendered) : rendered;
}

export function flattenAgentConsoleMarkdownLine(line?: AgentConsoleMarkdownLine | null): string {
    if (!line) {
        return '';
    }
    return `${line.prefix || ''}${line.tokens.map(token => token.text).join('')}`;
}

function renderCodeFenceHeader(language: string): AgentConsoleMarkdownLine {
    const label = String(language || '').trim();
    const tokens: AgentConsoleMarkdownToken[] = [{ text: '╭─', tone: 'muted' }];
    if (label) {
        tokens.push({ text: ` ${label} `, tone: 'accent' });
    }
    return { rawText: `\`\`\`${label}`, tokens, tone: 'muted' };
}

function renderCodeFenceFooter(): AgentConsoleMarkdownLine {
    return { rawText: '```', tokens: [{ text: '╰─', tone: 'muted' }], tone: 'muted' };
}

function renderCodeLineTokens(line: string, language: string, state: CommonSyntaxState): AgentConsoleMarkdownToken[] {
    const tokens = tokenizeCommonCodeLine(line, language, state);
    return tokens.map(token => ({
        text: token.text,
        tone: token.kind === 'plain' ? 'code' : SYNTAX_TONES[token.kind]
    }));
}

function resetCommonSyntaxState(state: CommonSyntaxState): void {
    state.blockComment = false;
}

function renderAgentConsoleMarkdownTextLine(sourceLine: string, width = DEFAULT_TABLE_WIDTH): AgentConsoleMarkdownLine {
    const original = String(sourceLine || '');
    let line = original;
    let prefix = '';
    let prefixTone: AgentConsoleMarkdownTone | undefined;
    let tone: AgentConsoleMarkdownTone | undefined;

    const strongHeadingMatch = STANDALONE_STRONG_HEADING_RE.exec(line);
    if (strongHeadingMatch) {
        return {
            rawText: original,
            tokens: tokenizeMarkdownInline(strongHeadingMatch[1].trim(), 'heading'),
            tone: 'heading'
        };
    }

    const shortHeadingMatch = SHORT_HEADING_RE.exec(line);
    if (shortHeadingMatch) {
        return {
            rawText: original,
            tokens: tokenizeMarkdownInline(shortHeadingMatch[2].trim(), 'heading'),
            tone: 'heading'
        };
    }

    const headingMatch = /^(\s*)(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
        prefix = headingMatch[1];
        prefixTone = 'heading';
        tone = 'heading';
        line = headingMatch[3];
    } else {
        const quoteMatch = /^(\s*)>\s?(.*)$/.exec(line);
        if (quoteMatch) {
            prefix = `${quoteMatch[1]}│ `;
            prefixTone = 'quote';
            tone = 'quote';
            line = quoteMatch[2];
        } else {
            const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line);
            if (taskMatch) {
                const checked = taskMatch[2].toLowerCase() === 'x';
                prefix = `${taskMatch[1]}${checked ? '☑' : '☐'} `;
                prefixTone = checked ? 'muted' : 'accent';
                line = taskMatch[3];
            } else {
                const orderedMatch = /^(\s*\d+\.)\s+(.*)$/.exec(line);
                if (orderedMatch) {
                    prefix = `${orderedMatch[1]} `;
                    prefixTone = 'accent';
                    line = orderedMatch[2];
                } else {
                    const bulletMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line);
                    if (bulletMatch) {
                        const depth = Math.floor(bulletMatch[1].replace(/\t/g, '  ').length / 2);
                        prefix = `${bulletMatch[1]}${depth >= 2 ? '▪' : depth === 1 ? '◦' : '•'} `;
                        prefixTone = 'accent';
                        line = bulletMatch[2];
                    }
                }
            }
        }
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(original)) {
        const ruleWidth = Math.max(8, Math.min(DEFAULT_TABLE_WIDTH, Math.floor(width || DEFAULT_TABLE_WIDTH)));
        return {
            rawText: original,
            tokens: [{ text: '─'.repeat(ruleWidth), tone: 'muted' }],
            tone: 'muted'
        };
    }

    return {
        rawText: original,
        prefix,
        prefixTone,
        tokens: tokenizeMarkdownInline(line, tone),
        tone
    };
}

function tokenizeMarkdownInline(value: string, baseTone?: AgentConsoleMarkdownTone): AgentConsoleMarkdownToken[] {
    const input = String(value || '');
    if (!input) {
        return [];
    }
    const tokens: AgentConsoleMarkdownToken[] = [];
    let lastIndex = 0;
    INLINE_MARKDOWN_RE.lastIndex = 0;
    let match = INLINE_MARKDOWN_RE.exec(input);
    while (match) {
        if (match.index > lastIndex) {
            tokens.push({
                text: input.slice(lastIndex, match.index),
                tone: baseTone
            });
        }
        if (match[1] !== undefined) {
            const alt = match[1] || 'image';
            const url = match[2] || '';
            tokens.push({
                text: url ? `${alt} (${url})` : alt,
                tone: 'accent'
            });
        } else if (match[3] !== undefined) {
            tokens.push({
                text: match[3] || match[4] || '',
                tone: 'link'
            });
        } else if (match[5] !== undefined || match[6] !== undefined) {
            tokens.push({
                text: match[5] || match[6] || '',
                tone: 'strong'
            });
        } else if (match[7] !== undefined) {
            tokens.push({
                text: match[7],
                tone: 'strike'
            });
        } else if (match[8] !== undefined) {
            tokens.push({
                text: match[8],
                tone: 'inline-code'
            });
        } else if (match[9] !== undefined || match[10] !== undefined) {
            tokens.push({
                text: match[9] || match[10] || '',
                tone: baseTone === 'quote' ? 'quote' : 'emphasis'
            });
        }
        lastIndex = match.index + match[0].length;
        match = INLINE_MARKDOWN_RE.exec(input);
    }
    if (lastIndex < input.length) {
        tokens.push({
            text: input.slice(lastIndex),
            tone: baseTone
        });
    }
    return tokens.length ? tokens : [{ text: input, tone: baseTone }];
}

function splitMarkdownTableRow(value: string): string[] {
    let line = String(value || '').trim();
    if (line.startsWith('|')) {
        line = line.slice(1);
    }
    if (line.endsWith('|') && !line.endsWith('\\|')) {
        line = line.slice(0, -1);
    }
    const cells: string[] = [];
    let cell = '';
    let escaped = false;
    let inCode = false;
    for (const char of line) {
        if (escaped) {
            cell += char === '|' || char === '\\' ? char : `\\${char}`;
            escaped = false;
        } else if (char === '\\') {
            escaped = true;
        } else if (char === '`') {
            inCode = !inCode;
            cell += char;
        } else if (char === '|' && !inCode) {
            cells.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    if (escaped) {
        cell += '\\';
    }
    cells.push(cell.trim());
    return cells;
}

function isMarkdownTableHeader(line: string, cells: string[], delimiterCells: string[]): boolean {
    if (!String(line || '').includes('|') || !cells.length || cells.length !== delimiterCells.length) {
        return false;
    }
    return delimiterCells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function markdownTableAligns(delimiterCells: string[]): MarkdownTableAlign[] {
    return delimiterCells.map(cell => {
        const left = cell.startsWith(':');
        const right = cell.endsWith(':');
        return left && right ? 'center' : right ? 'right' : 'left';
    });
}

function markdownTokensWidth(tokens: AgentConsoleMarkdownToken[]): number {
    return tokens.reduce((width, token) => width + getDisplayWidth(token.text), 0);
}

function wrapMarkdownTokens(tokens: AgentConsoleMarkdownToken[], width: number): AgentConsoleMarkdownToken[][] {
    const limit = Math.max(1, width);
    const lines: AgentConsoleMarkdownToken[][] = [[]];
    let currentWidth = 0;
    tokens.forEach(token => {
        let rest = token.text;
        while (rest) {
            if (currentWidth >= limit) {
                lines.push([]);
                currentWidth = 0;
            }
            const chunk = sliceByDisplayWidth(rest, limit - currentWidth) || rest.slice(0, 1);
            lines[lines.length - 1].push({ text: chunk, tone: token.tone });
            currentWidth += getDisplayWidth(chunk);
            rest = rest.slice(chunk.length);
        }
    });
    return lines;
}

function padMarkdownTokens(
    tokens: AgentConsoleMarkdownToken[],
    width: number,
    align: MarkdownTableAlign
): AgentConsoleMarkdownToken[] {
    const diff = Math.max(0, width - markdownTokensWidth(tokens));
    if (!diff) {
        return tokens;
    }
    const left = align === 'right' ? diff : align === 'center' ? Math.floor(diff / 2) : 0;
    const right = diff - left;
    const padded: AgentConsoleMarkdownToken[] = [];
    if (left) {
        padded.push({ text: ' '.repeat(left) });
    }
    padded.push(...tokens);
    if (right) {
        padded.push({ text: ' '.repeat(right) });
    }
    return padded;
}

function markdownTableLine(tokens: AgentConsoleMarkdownToken[]): AgentConsoleMarkdownLine {
    return {
        rawText: tokens.map(token => token.text).join(''),
        tokens
    };
}

function renderMarkdownTable(
    headerCells: string[],
    delimiterCells: string[],
    rows: string[][],
    width: number
): AgentConsoleMarkdownLine[] {
    const columnCount = Math.max(headerCells.length, delimiterCells.length, ...rows.map(row => row.length));
    const aligns = markdownTableAligns(delimiterCells);
    const headerRows = Array.from({ length: columnCount }, (_value, index) => headerCells[index] || '');
    const bodyRows = rows.map(row => Array.from({ length: columnCount }, (_value, index) => row[index] || ''));
    const naturalWidths = Array.from({ length: columnCount }, (_value, column) => Math.max(
        TABLE_MIN_COLUMN_WIDTH,
        markdownTokensWidth(tokenizeMarkdownInline(headerRows[column], 'heading')),
        ...bodyRows.map(row => markdownTokensWidth(tokenizeMarkdownInline(row[column])))
    ));
    const borderOverhead = (columnCount + 1) + columnCount * TABLE_CELL_PADDING_X * 2;
    const usable = width - borderOverhead;
    if (usable < columnCount * TABLE_MIN_COLUMN_WIDTH) {
        return renderMarkdownColumnTable(headerRows, bodyRows);
    }
    const available = usable;
    const contentWidths = naturalWidths.slice();
    let totalWidth = contentWidths.reduce((sum, item) => sum + item, 0);
    while (totalWidth > available) {
        let widest = 0;
        for (let column = 1; column < contentWidths.length; column++) {
            if (contentWidths[column] > contentWidths[widest]) {
                widest = column;
            }
        }
        if (contentWidths[widest] <= TABLE_MIN_COLUMN_WIDTH) {
            break;
        }
        contentWidths[widest] -= 1;
        totalWidth -= 1;
    }
    if (contentWidths.reduce((sum, item) => sum + item, 0) > available) {
        return renderMarkdownColumnTable(headerRows, bodyRows);
    }

    const border = (left: string, middle: string, right: string) => markdownTableLine([{
        text: `${left}${contentWidths.map(item => '─'.repeat(item + TABLE_CELL_PADDING_X * 2)).join(middle)}${right}`,
        tone: 'muted'
    }]);
    const renderRow = (cells: string[], headerRow: boolean): AgentConsoleMarkdownLine[] => {
        const cellLines = cells.map((cell, column) => {
            const tokens = tokenizeMarkdownInline(cell, headerRow ? 'heading' : undefined);
            return wrapMarkdownTokens(tokens, contentWidths[column]).map(line =>
                padMarkdownTokens(line, contentWidths[column], aligns[column] || 'left')
            );
        });
        const height = Math.max(1, ...cellLines.map(lines => lines.length));
        return Array.from({ length: height }, (_value, rowIndex) => {
            const tokens: AgentConsoleMarkdownToken[] = [{ text: '│', tone: 'muted' }];
            cellLines.forEach((lines, column) => {
                tokens.push({ text: ' ' });
                if (rowIndex < lines.length && lines[rowIndex].length) {
                    tokens.push(...lines[rowIndex]);
                } else {
                    tokens.push({ text: ' '.repeat(contentWidths[column]) });
                }
                tokens.push({ text: ' ' });
                tokens.push({ text: '│', tone: 'muted' });
            });
            return markdownTableLine(tokens);
        });
    };

    return [
        border('┌', '┬', '┐'),
        ...renderRow(headerRows, true),
        border('├', '┼', '┤'),
        ...bodyRows.flatMap(row => renderRow(row, false)),
        border('└', '┴', '┘')
    ];
}

function renderMarkdownColumnTable(headerCells: string[], rows: string[][]): AgentConsoleMarkdownLine[] {
    const renderRow = (cells: string[], headerRow: boolean): AgentConsoleMarkdownLine => ({
        rawText: cells.join(' | '),
        tokens: cells.flatMap((cell, index) => [
            ...(index ? [{ text: '  ' } as AgentConsoleMarkdownToken] : []),
            ...tokenizeMarkdownInline(cell, headerRow ? 'heading' : undefined)
        ])
    });
    return [renderRow(headerCells, true), ...rows.map(row => renderRow(row, false))];
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

function normalizeMarkdownStructure(content: string): string {
    const sourceLines = String(content || '').replace(/\r/g, '').split('\n');
    const normalized: string[] = [];
    let inFence = false;

    sourceLines.forEach(sourceLine => {
        const trimmed = sourceLine.trim();
        if (trimmed.startsWith('```')) {
            inFence = !inFence;
            normalized.push(sourceLine);
            return;
        }
        if (inFence) {
            normalized.push(sourceLine);
            return;
        }

        normalized.push(...expandInlineStructuredText(sourceLine));
    });

    return normalized.join('\n');
}

function expandInlineStructuredText(sourceLine: string): string[] {
    const original = String(sourceLine || '');
    if (!original.trim()) {
        return [original];
    }

    const numberedMatches = original.match(/\d+\.\s*/g) || [];
    if (numberedMatches.length < 2) {
        return [original];
    }

    let line = original
        .replace(/\s*[；;]\s*(?=\d+\.\s*)/g, '\n')
        .replace(/\s*[，,]\s*(?=\d+\.\s*)/g, '\n');

    const firstListIndex = line.search(/\d+\.\s*/);
    if (firstListIndex > 0) {
        const prefix = line.slice(0, firstListIndex).trimEnd();
        if (prefix.length && prefix.length <= 24 && !/[.!?。！？]$/.test(prefix)) {
            line = `${prefix}\n${line.slice(firstListIndex).trimStart()}`;
        }
    }

    return line.split('\n');
}
