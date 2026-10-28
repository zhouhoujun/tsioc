import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderPairingQr } from '../src/pair-qr';

@Suite('pairing QR')
export class PairingQrTest {
    @Test('renders a multi-line terminal QR for a pairing link')
    renders() {
        const qr = renderPairingQr('http://127.0.0.1:3100/?pair=abc123');
        expect(qr.split('\n').length).toBeGreaterThan(8);
        expect(qr).toContain('\u2588');
        expect(renderPairingQr('')).toEqual('');
    }
}
