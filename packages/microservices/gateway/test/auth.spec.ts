import expect = require('expect');
import { HmacSignatureService, HttpAuthService } from '@tsdi/security';
import { GatewayAuth } from '../src/gateway.auth';
import { GatewayRuntime } from '../src/gateway.runtime';
import { asStringArray, getClientIp, getHeaderValue, getRequestHost, matchClaimValue, matchesIp, normalizeGatewayUrl } from '../src/gateway.http';

describe('GatewayAuth', () => {
    function createRequest(overrides: any = {}) {
        const headers: Record<string, string> = { ...(overrides.headers ?? {}) };
        return {
            url: '/signed',
            method: 'GET',
            headers,
            query: {},
            getHeader(name: string) {
                return headers[name.toLowerCase()] ?? headers[name];
            },
            socket: { remoteAddress: '127.0.0.1' },
            ...overrides
        } as any;
    }

    function createContext() {
        const values = new Map<any, any>();
        return {
            values,
            set(token: any, value: any) {
                values.set(token, value);
                return this;
            },
            get(token: any) {
                return values.get(token);
            }
        } as any;
    }

    function create(options: any = {}, runtime = new GatewayRuntime()) {
        return {
            runtime,
            auth: new GatewayAuth(options, runtime, new HttpAuthService(), new HmacSignatureService())
        };
    }

    it('authenticates bearer tokens and exposes claims to the context', async () => {
        const { auth } = create({});
        const context = createContext();
        const request = createRequest({
            headers: { authorization: 'Bearer secret-token' }
        });

        await auth.authorize({ path: '/secure', auth: { bearerToken: 'secret-token' } } as any, request, context);
        expect(request._auth.authenticated).toBe(true);
        expect(context.values.size).toBe(1);

        await expect(auth.authorize(
            { path: '/secure', auth: { bearerToken: 'secret-token' } } as any,
            createRequest(),
            createContext()
        )).rejects.toMatchObject({ statusCode: 401, statusMessage: 'Unauthorized' });
    });

    it('validates api keys from headers and query strings', () => {
        const { auth } = create({});
        const route = { path: '/api', apiKey: { keys: ['valid-key'] } } as any;

        expect(() => auth.validateApiKey(route, createRequest({ headers: { 'x-api-key': 'valid-key' } }))).not.toThrow();
        expect(() => auth.validateApiKey(
            { path: '/api', apiKey: { keys: ['valid-key'], query: 'token' } } as any,
            createRequest({ query: { token: 'valid-key' } })
        )).not.toThrow();
        expect(() => auth.validateApiKey(route, createRequest({ headers: { 'x-api-key': 'bad' } })))
            .toThrow(/Invalid gateway api key/);
        expect(() => auth.validateApiKey(route, createRequest())).toThrow(/Invalid gateway api key/);
    });

    it('verifies hmac signatures, skew and replay protection', async () => {
        const { auth, runtime } = create({});
        const signatureService = new HmacSignatureService();
        const route = {
            path: '/signed',
            signature: { secret: 'gateway-secret', preventReplay: true, maxSkew: 60_000 }
        } as any;
        const runtimeWithNonce = new GatewayRuntime();
        const newAuth = new GatewayAuth({} as any, runtimeWithNonce, new HttpAuthService(), signatureService);

        const ts = String(Date.now());
        const nonce = 'nonce-1';
        const body = JSON.stringify({ amount: 1 });
        const canonical = ['POST', '/signed', ts, nonce, body].join('\n');
        const signature = signatureService.sign(canonical, 'gateway-secret');
        const request = () => createRequest({
            method: 'POST',
            rawBody: body,
            headers: {
                'x-signature': signature,
                'x-timestamp': ts,
                'x-nonce': nonce
            }
        });

        await newAuth.validateSignature(route, request());
        await expect(newAuth.validateSignature(route, request()))
            .rejects.toMatchObject({ statusCode: 409, statusMessage: 'Conflict' });

        await expect(auth.validateSignature(route, createRequest()))
            .rejects.toMatchObject({ statusCode: 401, statusMessage: 'Unauthorized' });

        const stale = String(Date.now() - 120_000);
        const staleCanonical = ['POST', '/signed', stale, 'n2', body].join('\n');
        await expect(auth.validateSignature(route, createRequest({
            method: 'POST',
            rawBody: body,
            headers: {
                'x-signature': signatureService.sign(staleCanonical, 'gateway-secret'),
                'x-timestamp': stale,
                'x-nonce': 'n2'
            }
        }))).rejects.toMatchObject({ statusCode: 401 });

        await expect(auth.validateSignature(route, createRequest({
            method: 'POST',
            rawBody: body,
            headers: {
                'x-signature': 'deadbeef',
                'x-timestamp': ts,
                'x-nonce': 'n3'
            }
        }))).rejects.toMatchObject({ statusCode: 401 });

        expect(runtime).toBeDefined();
    });

    it('enforces roles, scopes and custom claims with matchAny', () => {
        const { auth } = create({});
        const route = {
            path: '/orders',
            authorize: { roles: ['admin'], scopes: ['orders.read'], claims: { tenant: 'acme' } }
        } as any;

        const allowed = createRequest({
            _auth: { authenticated: true, claims: { role: ['admin'], scope: 'orders.read other', tenant: 'acme' } }
        });
        expect(() => auth.enforceAuthorization(route, allowed)).not.toThrow();

        expect(() => auth.enforceAuthorization(route, createRequest({
            _auth: { claims: { role: 'viewer', scope: 'orders.read', tenant: 'acme' } }
        }))).toThrow(/Forbidden gateway request/);

        const anyRoute = {
            path: '/orders',
            authorize: { roles: ['admin'], scopes: ['orders.write'], matchAny: true }
        } as any;
        expect(() => auth.enforceAuthorization(anyRoute, createRequest({
            _auth: { claims: { roles: 'admin', scopes: 'orders.read' } }
        }))).not.toThrow();

        expect(() => auth.enforceAuthorization(anyRoute, createRequest({
            _auth: { claims: { roles: 'viewer', scopes: 'orders.read' } }
        }))).toThrow(/Forbidden gateway request/);

        expect(() => auth.enforceAuthorization({ path: '/open', authorize: {} } as any, createRequest())).not.toThrow();
    });

    it('enforces ip allow and deny lists including cidr ranges', () => {
        const { auth } = create({});

        expect(() => auth.enforceAccessControl({
            path: '/api',
            accessControl: { denyIps: ['10.0.0.0/8'] }
        } as any, createRequest({ socket: { remoteAddress: '10.1.2.3' } }))).toThrow(/access denied/);

        expect(() => auth.enforceAccessControl({
            path: '/api',
            accessControl: { allowIps: ['192.168.1.0/24'] }
        } as any, createRequest({ socket: { remoteAddress: '192.168.1.9' } }))).not.toThrow();

        expect(() => auth.enforceAccessControl({
            path: '/api',
            accessControl: { allowIps: ['192.168.1.0/24'] }
        } as any, createRequest({ socket: { remoteAddress: '192.168.2.9' } }))).toThrow(/access denied/);

        expect(() => auth.enforceAccessControl({
            path: '/api',
            accessControl: { allowIps: ['10.0.0.1'] }
        } as any, createRequest({ headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } }))).not.toThrow();

        expect(() => auth.enforceAccessControl({ path: '/api', accessControl: { allowIps: ['10.0.0.1'] } } as any,
            createRequest({ socket: { remoteAddress: '' } }))).not.toThrow();
    });

    it('shares header, ip and prefix normalization helpers', () => {
        const request = createRequest({
            url: '/gateway/api/users?active=1',
            headers: { host: 'api.local', 'x-forwarded-for': '10.0.0.1, 10.0.0.2' }
        });

        expect(getHeaderValue(request, 'HOST')).toBe('api.local');
        expect(getRequestHost(request)).toBe('api.local');
        expect(getClientIp(request)).toBe('10.0.0.1');
        expect(normalizeGatewayUrl('/gateway/api/users?active=1', '/gateway')).toBe('/api/users');
        expect(normalizeGatewayUrl('/api/users', '/gateway')).toBe('/api/users');
        expect(normalizeGatewayUrl('/api/users', '/')).toBe('/api/users');
        expect(asStringArray('a b  c')).toEqual(['a', 'b', 'c']);
        expect(asStringArray(['a', 1])).toEqual(['a', '1']);
        expect(asStringArray(7)).toEqual(['7']);
        expect(asStringArray(undefined)).toEqual([]);
        expect(matchClaimValue(['a', 'b'], 'b')).toBe(true);
        expect(matchClaimValue('a', 'b')).toBe(false);
        expect(matchesIp('10.0.0.0/8', '10.4.5.6')).toBe(true);
        expect(matchesIp('10.0.0.0/8', '11.4.5.6')).toBe(false);
        expect(matchesIp('', '10.0.0.1')).toBe(false);
    });
});
