import * as qrcode from 'qrcode-terminal';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/**
 * Pick the URL to encode in the terminal QR. A phone scanning a loopback URL
 * would open its own 127.0.0.1, so prefer a non-loopback (LAN) link when the
 * host is bound to a wildcard address; fall back to the first URL otherwise.
 */
export function selectPairingQrUrl(urls: string[]): string {
    const list = (Array.isArray(urls) ? urls : []).map(url => String(url || '').trim()).filter(Boolean);
    const remote = list.find(url => {
        try {
            return !LOOPBACK_HOSTS.has(new URL(url).hostname.toLowerCase());
        } catch {
            return false;
        }
    });
    return remote || list[0] || '';
}

/** Render the pairing QR from the full URL list (LAN-first selection). */
export function renderPairingQrForUrls(urls: string[]): string {
    return renderPairingQr(selectPairingQrUrl(urls));
}

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
