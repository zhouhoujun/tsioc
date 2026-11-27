import expect = require('expect');
import * as crypto from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { clearHttpAuthJwksCache, HttpAuthService } from '../src/http/http-auth.service';

describe('HttpAuthService JWKS', () => {
    const issuer = 'https://idp.example';
    const audience = 'gateway';
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...(publicKey.export({ format: 'jwk' }) as any), kid: 'key-1', alg: 'RS256', use: 'sig' };
    const { privateKey: nextPrivate, publicKey: nextPublic } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const nextJwk = { ...(nextPublic.export({ format: 'jwk' }) as any), kid: 'key-2', alg: 'RS256', use: 'sig' };

    function token(key = privateKey as any, kid = 'key-1'): string {
        return jwt.sign({ sub: 'user-1', role: 'admin' }, key, {
            algorithm: 'RS256',
            issuer,
            audience,
            keyid: kid
        });
    }

    function request(value: string): any {
        return {
            url: '/api',
            method: 'GET',
            headers: { authorization: `Bearer ${value}` },
            socket: { remoteAddress: '127.0.0.1' }
        };
    }

    let originalFetch: typeof fetch;
    let calls: number;

    beforeEach(() => {
        clearHttpAuthJwksCache();
        originalFetch = globalThis.fetch;
        calls = 0;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    function serveJwks(keys: any[]) {
        globalThis.fetch = (async (url: any) => {
            calls += 1;
            if (String(url) !== `${issuer}/jwks`) {
                return { ok: false, status: 404 } as any;
            }
            return { ok: true, status: 200, async json() { return { keys }; } } as any;
        }) as any;
    }

    it('verifies tokens with a JWKS key and caches the document', async () => {
        serveJwks([jwk]);
        const auth = new HttpAuthService();
        const options = { jwt: { jwksURI: `${issuer}/jwks`, issuer, audience, algorithms: ['RS256'] as jwt.Algorithm[] } };
        const first = await auth.authenticate(request(token()), options);
        const second = await auth.authenticate(request(token()), options);

        expect(first.authenticated).toBe(true);
        expect(first.claims?.sub).toBe('user-1');
        expect(second.authenticated).toBe(true);
        expect(calls).toBe(1);
    });

    it('refreshes once when the provider rotates to a new kid', async () => {
        serveJwks([jwk]);
        const auth = new HttpAuthService();
        const options = { jwt: { jwksURI: `${issuer}/jwks`, issuer, audience, algorithms: ['RS256'] as jwt.Algorithm[] } };
        await auth.authenticate(request(token()), options);

        serveJwks([jwk, nextJwk]);
        const rotated = await auth.authenticate(request(token(nextPrivate as any, 'key-2')), options);
        expect(rotated.authenticated).toBe(true);
        // initial fetch + forced refresh
        expect(calls).toBe(2);
    });

    it('rejects tokens whose kid is unavailable and static keys still win', async () => {
        serveJwks([jwk]);
        const auth = new HttpAuthService();
        const options = { jwt: { jwksURI: `${issuer}/jwks`, issuer, audience, algorithms: ['RS256'] as jwt.Algorithm[] } };
        const unknown = await auth.authenticate(request(token(nextPrivate as any, 'missing')), options);
        expect(unknown.authenticated).toBe(false);

        const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
        const staticAuth = new HttpAuthService();
        const verified = await staticAuth.authenticate(request(token()), {
            jwt: { publicKey: pem, issuer, audience, algorithms: ['RS256'] }
        });
        expect(verified.authenticated).toBe(true);
    });
});
