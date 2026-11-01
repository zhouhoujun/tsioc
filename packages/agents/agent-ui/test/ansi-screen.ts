import { getDisplayWidth } from '@tsdi/components/console';

/**
 * Minimal ANSI screen buffer for TUI regression tests.
 *
 * `TuiTerminalSurface.lastRenderedLines` only proves the intended frame; the
 * terminal still scrolls the alternate screen when a painted line is wider than
 * the window or a frame writes more rows than fit. Feeding the real output
 * through this buffer lets tests assert what the user actually sees (pinned
 * tabs/composer, no native scrolling) instead of trusting the frame array.
 *
 * Zero-width markers (`\u200b`) reserve a row upstream but paint no cell, and an
 * LF after a full-width row starts the next row at column 0 (xterm/tmux
 * behaviour), so full-width rows do not double-space.
 */
export interface AnsiScreenBuffer {
    rows: string[][];
    readonly rowCount: number;
    readonly colCount: number;
    row: number;
    col: number;
    scrolledRows: number;
}

export function createAnsiScreenBuffer(rowCount: number, colCount: number): AnsiScreenBuffer {
    return {
        rows: Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ' ')),
        rowCount,
        colCount,
        row: 0,
        col: 0,
        scrolledRows: 0
    };
}

function scroll(buffer: AnsiScreenBuffer): void {
    buffer.rows.shift();
    buffer.rows.push(Array.from({ length: buffer.colCount }, () => ' '));
    buffer.scrolledRows += 1;
}

function advanceRow(buffer: AnsiScreenBuffer): void {
    buffer.row += 1;
    buffer.col = 0;
    if (buffer.row >= buffer.rowCount) {
        scroll(buffer);
        buffer.row = buffer.rowCount - 1;
    }
}

function writeChar(buffer: AnsiScreenBuffer, char: string): void {
    if (char === '\u200b' || char === '\ufeff') {
        return;
    }
    const width = Math.max(1, getDisplayWidth(char));
    if (buffer.col + width > buffer.colCount) {
        advanceRow(buffer);
    }
    buffer.rows[buffer.row][buffer.col] = char;
    for (let offset = 1; offset < width; offset++) {
        buffer.rows[buffer.row][buffer.col + offset] = '';
    }
    buffer.col += width;
}

export function feedAnsiScreen(buffer: AnsiScreenBuffer, output: string): void {
    let index = 0;
    while (index < output.length) {
        const rest = output.slice(index);
        if (rest.startsWith('\x1b[')) {
            const match = /^\x1b\[([0-9;?]*)([A-Za-z])/.exec(rest);
            if (!match) {
                index += 2;
                continue;
            }
            const params = match[1];
            const command = match[2];
            index += match[0].length;
            if (command === 'H' || command === 'f') {
                const parts = params.split(';').filter(Boolean).map(Number);
                buffer.row = Math.max(0, Math.min((parts[0] || 1) - 1, buffer.rowCount - 1));
                buffer.col = Math.max(0, Math.min((parts[1] || 1) - 1, buffer.colCount - 1));
            } else if (command === 'J') {
                if (params === '2') {
                    buffer.rows = Array.from({ length: buffer.rowCount }, () => Array.from({ length: buffer.colCount }, () => ' '));
                } else {
                    for (let col = buffer.col; col < buffer.colCount; col++) buffer.rows[buffer.row][col] = ' ';
                    for (let row = buffer.row + 1; row < buffer.rowCount; row++) {
                        buffer.rows[row] = Array.from({ length: buffer.colCount }, () => ' ');
                    }
                }
            } else if (command === 'K') {
                for (let col = buffer.col; col < buffer.colCount; col++) buffer.rows[buffer.row][col] = ' ';
            } else if (command === 'A') {
                buffer.row = Math.max(0, buffer.row - Number(params || 1));
            } else if (command === 'B') {
                buffer.row = Math.min(buffer.rowCount - 1, buffer.row + Number(params || 1));
            } else if (command === 'C') {
                buffer.col = Math.min(buffer.colCount - 1, buffer.col + Number(params || 1));
            } else if (command === 'D') {
                buffer.col = Math.max(0, buffer.col - Number(params || 1));
            }
            continue;
        }
        if (rest.startsWith('\x1b')) {
            index += 1;
            continue;
        }
        const char = rest[0];
        if (char === '\n') {
            advanceRow(buffer);
        } else if (char === '\r') {
            buffer.col = 0;
        } else {
            writeChar(buffer, char);
        }
        index += 1;
    }
}

export function ansiScreenLines(buffer: AnsiScreenBuffer): string[] {
    return buffer.rows.map(row => row.join('').replace(/\s+$/g, ''));
}
