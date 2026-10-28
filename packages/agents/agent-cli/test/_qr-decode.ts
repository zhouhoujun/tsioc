/**
 * Decode a `qrcode-terminal` small-mode rendering back to its payload.
 * Used by pairing tests to assert what the printed QR actually carries.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsQR = require('jsqr');

export function decodeTerminalQr(qr: string): string {
    const lines = String(qr || '').split('\n').filter(line => line.length > 0);
    if (!lines.length) {
        return '';
    }
    const width = Math.max(...lines.map(line => line.length));
    const scale = 6;
    const quiet = 4;
    const size = (width + quiet * 2) * scale;
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    const set = (x: number, y: number): void => {
        const base = (y * size + x) * 4;
        data[base] = 0;
        data[base + 1] = 0;
        data[base + 2] = 0;
        data[base + 3] = 255;
    };
    lines.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) {
            const ch = line[col];
            const top = ch === '\u2580' || ch === '\u2588';
            const bottom = ch === '\u2584' || ch === '\u2588';
            for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                    if (top) {
                        set((quiet + col) * scale + sx, (quiet + row * 2) * scale + sy);
                    }
                    if (bottom) {
                        set((quiet + col) * scale + sx, (quiet + row * 2 + 1) * scale + sy);
                    }
                }
            }
        }
    });
    const found = jsQR(data, size, size, { inversionAttempts: 'attemptBoth' });
    return found ? String(found.data) : '';
}
