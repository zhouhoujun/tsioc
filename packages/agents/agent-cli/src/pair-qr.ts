import * as qrcode from 'qrcode-terminal';

/** Render a terminal QR (half-block characters) for a pairing link; '' when unavailable. */
export function renderPairingQr(url: string): string {
    const text = String(url || '').trim();
    if (!text) {
        return '';
    }
    let output = '';
    try {
        qrcode.generate(text, { small: true }, (qr: string) => {
            output = qr;
        });
    } catch {
        return '';
    }
    return String(output || '').replace(/\s+$/, '');
}
