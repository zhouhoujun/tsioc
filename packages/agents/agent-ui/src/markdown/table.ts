import { tokenizeMarkdownInline } from './inline';
import { AgentConsoleMarkdownLine, AgentConsoleMarkdownToken } from './model';
import { getDisplayWidth, sliceByDisplayWidth } from '../AgentConsoleTextWidth';

/**
 * Grid tables modelled on opencode's `tableOptions: { style: "grid", cellPaddingX: 1 }`:
 * the grid fills the available width, columns share it proportionally to their
 * content, cells word-wrap, and every row is separated (full grid).
 */

const TABLE_CELL_PADDING_X = 1;
const TABLE_MIN_COLUMN_WIDTH = 3;

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

/** Longest unbreakable ASCII word (words should not split while space allows). */
function longestWordWidth(value: string): number {
    const words = String(value || '').match(/[A-Za-z0-9][A-Za-z0-9_./:@#+-]*/g) || [];
    return words.reduce((max, word) => Math.max(max, getDisplayWidth(word)), 0);
}

interface WrapUnit {
    tokens: AgentConsoleMarkdownToken[];
    whitespace: boolean;
    width: number;
}

/** Split styled text into word/space units so cells wrap on words, not columns. */
function buildWrapUnits(tokens: AgentConsoleMarkdownToken[]): WrapUnit[] {
    const units: WrapUnit[] = [];
    tokens.forEach(token => {
        const parts = String(token.text || '').match(/\s+|\S+/g) || [];
        parts.forEach(part => {
            const whitespace = !part.trim();
            const previous = units[units.length - 1];
            if (previous && previous.whitespace === whitespace) {
                previous.tokens.push({ text: part, tone: token.tone });
                previous.width += getDisplayWidth(part);
                return;
            }
            units.push({
                tokens: [{ text: part, tone: token.tone }],
                whitespace,
                width: getDisplayWidth(part)
            });
        });
    });
    return units;
}

function sliceTokens(tokens: AgentConsoleMarkdownToken[], width: number): {
    head: AgentConsoleMarkdownToken[];
    tail: AgentConsoleMarkdownToken[];
} {
    const head: AgentConsoleMarkdownToken[] = [];
    const tail: AgentConsoleMarkdownToken[] = [];
    let remaining = width;
    tokens.forEach(token => {
        const chunk = remaining > 0 ? sliceByDisplayWidth(token.text, remaining) : '';
        if (chunk) {
            head.push({ text: chunk, tone: token.tone });
            remaining -= getDisplayWidth(chunk);
        }
        const rest = token.text.slice(chunk.length);
        if (rest) {
            tail.push({ text: rest, tone: token.tone });
        }
    });
    return { head, tail };
}

function wrapMarkdownTokens(tokens: AgentConsoleMarkdownToken[], width: number): AgentConsoleMarkdownToken[][] {
    const limit = Math.max(1, width);
    const lines: AgentConsoleMarkdownToken[][] = [];
    let current: AgentConsoleMarkdownToken[] = [];
    let currentWidth = 0;
    const flush = () => {
        lines.push(current);
        current = [];
        currentWidth = 0;
    };
    let pending: WrapUnit[] = [];
    const append = (units: WrapUnit[]) => {
        units.forEach(unit => unit.tokens.forEach(token => {
            current.push(token);
            currentWidth += getDisplayWidth(token.text);
        }));
    };

    buildWrapUnits(tokens).forEach(unit => {
        if (unit.whitespace) {
            pending.push(unit);
            return;
        }
        const pendingWidth = pending.reduce((sum, item) => sum + item.width, 0);
        if (currentWidth > 0 && currentWidth + pendingWidth + unit.width > limit) {
            pending = [];
            flush();
        }
        append(pending);
        pending = [];
        if (currentWidth + unit.width <= limit) {
            append([unit]);
            return;
        }
        let rest = unit.tokens;
        while (rest.length) {
            const remaining = limit - currentWidth;
            if (remaining <= 0) {
                flush();
                continue;
            }
            const { head, tail } = sliceTokens(rest, remaining);
            if (!head.length) {
                // A wide glyph on a one-column cell: force one code point.
                const forced = sliceTokens(rest, getDisplayWidth(Array.from(rest[0].text)[0] || ' ') || 1);
                append([{ tokens: forced.head, whitespace: false, width: markdownTokensWidth(forced.head) }]);
                rest = forced.tail;
                flush();
                continue;
            }
            append([{ tokens: head, whitespace: false, width: markdownTokensWidth(head) }]);
            if (!tail.length) {
                return;
            }
            rest = tail;
            flush();
        }
    });
    if (pending.length && currentWidth < limit) {
        append([{ tokens: sliceTokens(pending.flatMap(unit => unit.tokens), limit - currentWidth).head, whitespace: false, width: 0 }]);
    }
    if (!lines.length || current.length) {
        lines.push(current);
    }
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

/**
 * Full-width, proportional column allocation. Each column gets a share of the
 * available content width based on its natural width, never below the minimum.
 */
function distributeColumnWidths(
    naturalWidths: number[],
    minimumWidths: number[],
    available: number
): number[] | undefined {
    const columnCount = naturalWidths.length;
    if (!columnCount || available < minimumWidths.reduce((sum, width) => sum + width, 0)) {
        return undefined;
    }
    const weights = naturalWidths.map(width => Math.max(TABLE_MIN_COLUMN_WIDTH, width));
    const totalWeight = weights.reduce((sum, width) => sum + width, 0);
    const exact = weights.map(weight => (available * weight) / totalWeight);
    const widths = exact.map((value, index) => Math.max(minimumWidths[index], Math.floor(value)));
    let sum = widths.reduce((value, width) => value + width, 0);

    // Hand out rounding remainder to the columns that lost the most.
    while (sum < available) {
        let best = -1;
        let bestRemainder = -1;
        widths.forEach((width, index) => {
            const remainder = exact[index] - width;
            if (remainder > bestRemainder) {
                best = index;
                bestRemainder = remainder;
            }
        });
        if (best < 0) {
            break;
        }
        widths[best] += 1;
        sum += 1;
    }
    // Min-width clamps can overshoot; take it back from the widest columns.
    while (sum > available) {
        let widest = -1;
        widths.forEach((width, index) => {
            if (width > minimumWidths[index] && (widest < 0 || width > widths[widest])) {
                widest = index;
            }
        });
        if (widest < 0) {
            return undefined;
        }
        widths[widest] -= 1;
        sum -= 1;
    }
    return widths;
}

function markdownTableLine(tokens: AgentConsoleMarkdownToken[]): AgentConsoleMarkdownLine {
    return {
        rawText: tokens.map(token => token.text).join(''),
        tokens,
        table: true
    };
}

export function renderMarkdownTable(
    headerCells: string[],
    delimiterCells: string[],
    rows: string[][],
    width: number
): AgentConsoleMarkdownLine[] {
    const columnCount = Math.max(headerCells.length, delimiterCells.length, ...rows.map(row => row.length));
    const aligns: Array<'left' | 'center' | 'right'> = markdownTableAligns(delimiterCells);
    const headerRows = Array.from({ length: columnCount }, (_value, index) => headerCells[index] || '');
    const bodyRows = rows.map(row => Array.from({ length: columnCount }, (_value, index) => row[index] || ''));
    const naturalWidths = Array.from({ length: columnCount }, (_value, column) => Math.max(
        TABLE_MIN_COLUMN_WIDTH,
        markdownTokensWidth(tokenizeMarkdownInline(headerRows[column], 'heading')),
        ...bodyRows.map(row => markdownTokensWidth(tokenizeMarkdownInline(row[column])))
    ));
    const borderOverhead = (columnCount + 1) + columnCount * TABLE_CELL_PADDING_X * 2;
    const available = Math.max(0, Math.floor(width) - borderOverhead);
    const headerWidths = headerRows.map(cell => markdownTokensWidth(tokenizeMarkdownInline(cell, 'heading')));
    // Columns never render narrower than their header (numeric columns stay
    // aligned instead of splitting 数值 into two rows), unless space forces it.
    const longestWordWidths = Array.from({ length: columnCount }, (_value, column) => Math.max(
        headerWidths[column],
        longestWordWidth(headerRows[column]),
        ...bodyRows.map(row => longestWordWidth(row[column]))
    ));
    const share = Math.max(TABLE_MIN_COLUMN_WIDTH, Math.floor(available / columnCount));
    const minimumWidths = naturalWidths.map((width, index) => {
        // Keep short numbers and unbreakable words intact, give CJK columns at
        // least ~3 glyphs, but never exceed an equal share of the available
        // width (otherwise a narrow terminal would force the columns fallback).
        const valueFloor = aligns[index] === 'right' ? Math.min(width, 12) : 0;
        const desired = Math.max(
            headerWidths[index],
            Math.min(longestWordWidths[index], 12),
            valueFloor,
            Math.min(6, width)
        );
        return Math.min(width, desired, share);
    });
    const contentWidths = distributeColumnWidths(naturalWidths, minimumWidths, available);
    if (!contentWidths) {
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

    const lines: AgentConsoleMarkdownLine[] = [
        border('┌', '┬', '┐'),
        ...renderRow(headerRows, true),
        border('├', '┼', '┤')
    ];
    bodyRows.forEach((row, index) => {
        lines.push(...renderRow(row, false));
        if (index < bodyRows.length - 1) {
            // opencode's grid style draws inner borders too: every row is ruled.
            lines.push(border('├', '┼', '┤'));
        }
    });
    lines.push(border('└', '┴', '┘'));
    if (lines[0]) {
        lines[0] = {
            ...lines[0],
            tableData: { header: headerRows, rows: bodyRows, aligns }
        };
    }
    return lines;
}

function renderMarkdownColumnTable(headerCells: string[], rows: string[][]): AgentConsoleMarkdownLine[] {
    const width = Math.max(headerCells.length, ...rows.map(row => row.length));
    const header = Array.from({ length: width }, (_value, index) => headerCells[index] || '');
    const body = rows.map(row => Array.from({ length: width }, (_value, index) => row[index] || ''));
    const renderRow = (cells: string[], headerRow: boolean): AgentConsoleMarkdownLine => ({
        rawText: cells.join(' | '),
        tokens: cells.flatMap((cell, index) => [
            ...(index ? [{ text: '  ' } as AgentConsoleMarkdownToken] : []),
            ...tokenizeMarkdownInline(cell, headerRow ? 'heading' : undefined)
        ]),
        table: true
    });
    const lines = [renderRow(header, true), ...body.map(row => renderRow(row, false))];
    lines[0] = {
        ...lines[0],
        tableData: {
            header,
            rows: body,
            aligns: header.map(() => 'left' as const)
        }
    };
    return lines;
}
