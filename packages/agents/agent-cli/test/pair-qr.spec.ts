import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { renderPairingQr, renderPairingQrForUrls, selectPairingQrUrl } from '../src/pair-qr';
import { decodeTerminalQr } from './_qr-decode';

@Suite('pairing QR')
export class PairingQrTest {
    @Test('renders a multi-line terminal QR for a pairing link')
    renders() {
        const qr = renderPairingQr('http://127.0.0.1:3100/?pair=abc123');
        expect(qr.split('\n').length).toBeGreaterThan(8);
        expect(qr).toContain('\u2588');
        expect(renderPairingQr('')).toEqual('');
    }

    @Test('the printed QR carries the LAN link, not the phone loopback')
    decodesLan() {
        const loopback = 'http://127.0.0.1:3100/?pair=abc123';
        const lan = 'http://192.168.1.5:3100/?pair=abc123';
        expect(decodeTerminalQr(renderPairingQrForUrls([loopback, lan]))).toEqual(lan);
        expect(decodeTerminalQr(renderPairingQrForUrls([loopback]))).toEqual(loopback);
    }

    @Test('QR prefers a LAN link so a scanned code does not hit the phone loopback')
    selectsLanFirst() {
        const loopback = 'http://127.0.0.1:3100/?pair=abc';
        const lan = 'http://192.168.1.5:3100/?pair=abc';
        expect(selectPairingQrUrl([loopback, lan])).toEqual(lan);
        expect(selectPairingQrUrl([loopback])).toEqual(loopback);
        expect(selectPairingQrUrl(['http://localhost:3100/?pair=abc', 'http://[::1]:3100/?pair=abc'])).toEqual('http://localhost:3100/?pair=abc');
        expect(selectPairingQrUrl([])).toEqual('');
        expect(selectPairingQrUrl(undefined as any)).toEqual('');
    }
}
