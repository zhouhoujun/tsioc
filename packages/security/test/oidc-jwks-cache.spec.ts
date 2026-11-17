import { OIDCOptions } from '../src';
import { clearJwksCache, OIDCService } from '../src/oidc/oidc.service';
import expect = require('expect');

function createJwtService() {
    return {
        decodeHeader: (_token: string) => ({ kid: 'kid-1' }),
        verify: async (_token: string, _options: any) => ({
            sub: 'user-1',
            exp: Math.floor(Date.now() / 1000) + 60,
            iat: Math.floor(Date.now() / 1000) - 10,
            iss: 'https://issuer.example',
            aud: ['client-id']
        }),
        importKey: (key: any) => `pem:${key.kid}`
    } as any;
}

function options(jwksURI = 'https://issuer.example/jwks'): OIDCOptions {
    return new OIDCOptions(
        'client-id',
        'client-secret',
        'https://issuer.example/auth',
        'https://issuer.example/token',
        'https://issuer.example/profile',
        'https://app.example/callback',
        'https://issuer.example',
        jwksURI
    );
}

describe('OIDCService JWKS cache', () => {

    it('fetches the JWKS document once for repeated validations', async () => {
        clearJwksCache();
        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        let calls = 0;
        fetchMod.fetch = async () => {
            calls += 1;
            return { json: async () => ({ keys: [{ kid: 'kid-1', kty: 'RSA' }] }) };
        };
        try {
            const service = new OIDCService(createJwtService());
            await service.validateIDToken('token', options());
            await service.validateIDToken('token', options());
            await service.validateIDToken('token', options());

            expect(calls).toBe(1);
        } finally {
            fetchMod.fetch = originalFetch;
            clearJwksCache();
        }
    });

    it('refreshes once when the signing key rotated', async () => {
        clearJwksCache();
        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        let calls = 0;
        fetchMod.fetch = async () => {
            calls += 1;
            return calls === 1
                ? { json: async () => ({ keys: [{ kid: 'old-kid', kty: 'RSA' }] }) }
                : { json: async () => ({ keys: [{ kid: 'kid-1', kty: 'RSA' }] }) };
        };
        try {
            const service = new OIDCService(createJwtService());
            const decoded = await service.validateIDToken('token', options());

            expect(decoded.sub).toBe('user-1');
            expect(calls).toBe(2);
        } finally {
            fetchMod.fetch = originalFetch;
            clearJwksCache();
        }
    });

    it('fails when the key is missing even after a refresh', async () => {
        clearJwksCache();
        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        let calls = 0;
        fetchMod.fetch = async () => {
            calls += 1;
            return { json: async () => ({ keys: [{ kid: 'other-kid', kty: 'RSA' }] }) };
        };
        try {
            const service = new OIDCService(createJwtService());
            await expect(service.validateIDToken('token', options())).rejects.toThrow('Public key not found');
            expect(calls).toBe(2);
        } finally {
            fetchMod.fetch = originalFetch;
            clearJwksCache();
        }
    });

    it('expires the cached document after the configured TTL', async () => {
        clearJwksCache();
        const fetchMod = require('cross-fetch');
        const originalFetch = fetchMod.fetch;
        const originalTtl = process.env.OIDC_JWKS_CACHE_TTL_MS;
        let calls = 0;
        fetchMod.fetch = async () => {
            calls += 1;
            return { json: async () => ({ keys: [{ kid: 'kid-1', kty: 'RSA' }] }) };
        };
        try {
            process.env.OIDC_JWKS_CACHE_TTL_MS = '0';
            const service = new OIDCService(createJwtService());
            await service.validateIDToken('token', options());
            await service.validateIDToken('token', options());

            expect(calls).toBe(2);
        } finally {
            fetchMod.fetch = originalFetch;
            if (originalTtl === undefined) {
                delete process.env.OIDC_JWKS_CACHE_TTL_MS;
            } else {
                process.env.OIDC_JWKS_CACHE_TTL_MS = originalTtl;
            }
            clearJwksCache();
        }
    });

    it('still requires a configured JWKS URI', async () => {
        clearJwksCache();
        const service = new OIDCService(createJwtService());
        await expect(service.validateIDToken('token', options('')))
            .rejects.toThrow(/JWKS URI not configured/);
    });

});
