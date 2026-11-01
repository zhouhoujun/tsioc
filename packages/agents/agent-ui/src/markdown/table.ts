import { tokenizeMarkdownInline } from './inline';
import { AgentConsoleMarkdownLine, AgentConsoleMarkdownToken } from './model';
import { getDisplayWidth, sliceByDisplayWidth } from '../AgentConsoleTextWidth';

export const MARKDOWN_TABLE_CELL_PADDING_X = 1;
export const MARKDOWN_TABLE_MIN_COLUMN_WIDTH = 3;

type MarkdownTableAlign = 'left' | 'center' | 'right';

export function splitMarkdownTableRow(value: string): string[] {
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

export function isMarkdownTableHeader(line: string, cells: string[], delimiterCells: string[]): boolean {
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

export function renderMarkdownTable(
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
        MARKDOWN_TABLE_MIN_COLUMN_WIDTH,
        markdownTokensWidth(tokenizeMarkdownInline(headerRows[column], 'heading')),
        ...bodyRows.map(row => markdownTokensWidth(tokenizeMarkdownInline(row[column])))
    ));
    const borderOverhead = (columnCount + 1) + columnCount * MARKDOWN_TABLE_CELL_PADDING_X * 2;
    const usable = width - borderOverhead;
    if (usable < columnCount * MARKDOWN_TABLE_MIN_COLUMN_WIDTH) {
        return renderMarkdownColumnTable(headerRows, bodyRows);
    }
    const contentWidths = naturalWidths.slice();
    let totalWidth = contentWidths.reduce((sum, item) => sum + item, 0);
    while (totalWidth > usable) {
        let widest = 0;
        for (let column = 1; column < contentWidths.length; column++) {
            if (contentWidths[column] > contentWidths[widest]) {
                widest = column;
            }
        }
        if (contentWidths[widest] <= MARKDOWN_TABLE_MIN_COLUMN_WIDTH) {
            break;
        }
        contentWidths[widest] -= 1;
        totalWidth -= 1;
    }
    if (contentWidths.reduce((sum, item) => sum + item, 0) > usable) {
        return renderMarkdownColumnTable(headerRows, bodyRows);
    }

    const border = (left: string, middle: string, right: string) => markdownTableLine([{
        text: `${left}${contentWidths.map(item => '─'.repeat(item + MARKDOWN_TABLE_CELL_PADDING_X * 2)).join(middle)}${right}`,
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
