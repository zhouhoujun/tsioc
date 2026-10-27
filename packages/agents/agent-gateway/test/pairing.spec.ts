import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { HttpAuthService } from '@tsdi/security';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { PairHandler } from '../src/api/PairHandler';
import { PairingStore } from '../src/auth/PairingStore';
import { AuthMiddleware } from '../src/auth/AuthMiddleware';
import { RateLimiter } from '../src/auth/RateLimiter';
import { defaultGatewayConfig } from '../src/contracts/GatewayConfig';

function authHeaders(token?: string): Record<string, string> {
    return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

@Suite('gateway pairing (web console)')
export class GatewayPairingTest {
    @Test('static page is public, pairing codes are one-time and mint requires auth')
    async pairFlow() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-pair-'));
        fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>web</title>');
        const config = { ...defaultGatewayConfig, host: '127.0.0.1', port: 0, authToken: 'secret', staticDir: dir, cors: false } as any;
        const auth = new AuthMiddleware(new HttpAuthService(), config);
        const gateway = new GatewayServer(auth, new RateLimiter(config), {} as any, config);
        const pairing = new PairingStore();
        gateway.addRoutes(new PairHandler(pairing, gateway, config).getRoutes());
        await gateway.start(config);
        const base = `http://127.0.0.1:${gateway.address()!.port}`;
        try {
            const page = await fetch(`${base}/`);
            expect(page.status).toEqual(200);
            expect(await page.text()).toContain('<title>web</title>');

            const unauthorized = await fetch(`${base}/api/pair/create`, { method: 'POST', headers: authHeaders() });
            expect(unauthorized.status).toEqual(401);

            const created = await fetch(`${base}/api/pair/create`, { method: 'POST', headers: authHeaders('secret') });
            expect(created.status).toEqual(200);
            const entry = await created.json() as any;
            expect(entry.code).toBeTruthy();
            expect(entry.urls[0]).toContain(`?pair=${encodeURIComponent(entry.code)}`);
            expect(entry.urls[0]).toContain('127.0.0.1');

            const redeemed = await fetch(`${base}/api/pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: entry.code })
            });
            expect(redeemed.status).toEqual(200);
            expect(await redeemed.json()).toEqual({ token: 'secret' });

            const reused = await fetch(`${base}/api/pair`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: entry.code })
            });
            expect(reused.status).toEqual(401);
        } finally {
            await gateway.stop();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
}
