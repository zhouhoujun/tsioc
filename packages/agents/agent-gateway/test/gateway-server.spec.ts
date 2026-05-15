import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { HttpAuthService, JWTService } from '@tsdi/security';
import { GatewayServer } from '../src/gateway/GatewayServer';
import { RouteMatcher } from '../src/gateway/RouteMatcher';
import { RateLimiter } from '../src/auth/RateLimiter';
import { AuthMiddleware } from '../src/auth/AuthMiddleware';
import { PairingStore } from '../src/auth/PairingStore';

@Suite('RouteMatcher')
export class RouteMatcherTest {
    @Test('matches exact paths')
    matchExact() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/health', handler: async (req: any, res: any) => {} });
        const r = m.match('GET', '/health');
        expect(r).toBeTruthy();
        expect(r!.route.path).toBe('/health');
    }

    @Test('matches path parameters')
    matchParams() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/api/sessions/:id/messages', handler: async (req: any, res: any) => {} });
        const r = m.match('GET', '/api/sessions/abc123/messages');
        expect(r).toBeTruthy();
        expect(r!.params['id']).toBe('abc123');
    }

    @Test('returns null for unmatched paths')
    noMatch() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/health', handler: async (req: any, res: any) => {} });
        expect(m.match('GET', '/missing')).toBeNull();
    }

    @Test('matches method correctly')
    matchMethod() {
        const m = new RouteMatcher();
        m.add({ method: 'POST', path: '/api/memory', handler: async (req: any, res: any) => {} });
        expect(m.match('GET', '/api/memory')).toBeNull();
        expect(m.match('POST', '/api/memory')).toBeTruthy();
    }

    @Test('matches catch-all wildcard')
    matchWildcard() {
        const m = new RouteMatcher();
        m.add({ method: 'GET', path: '/api/*', handler: async (req: any, res: any) => {} });
        const r = m.match('GET', '/api/tools');
        expect(r).toBeTruthy();
    }
}

@Suite('RateLimiter')
export class RateLimiterTest {
    @Test('allows requests within limit and blocks over limit')
    checkLimit() {
        const limiter = new RateLimiter();
        (limiter as any).config = { rateLimitMax: 2, rateLimitWindowMs: 60000 };

        expect(limiter.check('10.0.0.1')).toBe(true);
        expect(limiter.check('10.0.0.1')).toBe(true);
        expect(limiter.check('10.0.0.1')).toBe(false);

        expect(limiter.check('10.0.0.2')).toBe(true);
    }
}

@Suite('AuthMiddleware')
export class AuthMiddlewareTest {
    @Test('extracts Bearer token from Authorization header')
    extractToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = { authToken: 'secret' };

        const req = { headers: { authorization: 'Bearer secret' } } as any;
        expect(auth.extractToken(req)).toBe('secret');
    }

    @Test('extracts token from Sec-WebSocket-Protocol')
    extractWsToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        const req = { headers: { 'sec-websocket-protocol': 'bearer.ws-token' } } as any;
        expect(auth.extractToken(req)).toBe('ws-token');
    }

    @Test('extracts token from query parameter')
    extractQueryToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        const req = { headers: { host: 'localhost' }, url: '/ws/chat?token=query-token' } as any;
        expect(auth.extractToken(req)).toBe('query-token');
    }

    @Test('verifies token correctly')
    verifyToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = { authToken: 'my-token' };

        expect(auth.verify('my-token')).toBe(true);
        expect(auth.verify('wrong')).toBe(false);
        expect(auth.verify(null)).toBe(false);
    }

    @Test('returns null for missing auth header')
    missingToken() {
        const auth = new AuthMiddleware(new HttpAuthService());
        const req = { headers: {} } as any;
        expect(auth.extractToken(req)).toBeNull();
    }

    @Test('authenticate succeeds when auth is disabled')
    async authDisabled() {
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = { authToken: '' };

        const req = { headers: {} } as any;
        const res = { writeHead: () => res, end: () => {} } as any;
        expect(await auth.authenticate(req, res)).toBe(true);
    }

    @Test('shared http auth service verifies jwt tokens for gateway use')
    async verifyJwtThroughSharedService() {
        const jwtService = new JWTService();
        const httpAuth = new HttpAuthService(jwtService);
        const token = await jwtService.sign({ sub: 'gateway-user' }, { privateKey: 'secret-key' as any });
        const claims = await httpAuth.verifyJwtToken(token, {
            publicKey: 'secret-key' as any,
            algorithms: ['HS256']
        });
        expect(claims.sub).toBe('gateway-user');
    }

    @Test('auth middleware accepts valid jwt token')
    async authenticateJwt() {
        const jwtService = new JWTService();
        const auth = new AuthMiddleware(new HttpAuthService());
        (auth as any).config = {
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        };

        const token = await jwtService.sign({ sub: 'gateway-user' }, { privateKey: 'secret-key' as any });
        const req = { headers: { authorization: `Bearer ${token}` } } as any;
        const res = { writeHead: () => res, end: () => {} } as any;
        expect(await auth.authenticate(req, res)).toBe(true);
    }
}

@Suite('GatewayServer JWT auth')
export class GatewayServerJwtAuthTest {
    @Test('accepts route request with valid jwt token')
    async acceptsJwtRequest() {
        const jwtService = new JWTService();
        const config = {
            cors: false,
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        } as any;
        const auth = new AuthMiddleware(new HttpAuthService(jwtService), config);
        const rateLimiter = { checkAndRespond: () => true } as any;
        const server = new GatewayServer(auth, rateLimiter, {} as any, config);
        let handled = false;
        server.addRoute({
            method: 'GET',
            path: '/health',
            handler: async (_req: any, res: any) => {
                handled = true;
                res.writeHead(200).end();
            }
        });

        const token = await jwtService.sign({ sub: 'gateway-user' }, { privateKey: 'secret-key' as any });
        const req = {
            method: 'GET',
            url: '/health',
            headers: { host: 'localhost', authorization: `Bearer ${token}` },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res,
            setHeader: () => {}
        } as any;

        await (server as any).handleRequest(req, res);
        expect(handled).toBe(true);
        expect(status).toBe(200);
    }

    @Test('rejects route request with invalid jwt token')
    async rejectsInvalidJwtRequest() {
        const config = {
            cors: false,
            auth: {
                jwt: {
                    publicKey: 'secret-key' as any,
                    algorithms: ['HS256']
                }
            }
        } as any;
        const auth = new AuthMiddleware(new HttpAuthService(), config);
        const rateLimiter = { checkAndRespond: () => true } as any;
        const server = new GatewayServer(auth, rateLimiter, {} as any, config);
        let handled = false;
        server.addRoute({
            method: 'GET',
            path: '/health',
            handler: async () => {
                handled = true;
            }
        });

        const req = {
            method: 'GET',
            url: '/health',
            headers: { host: 'localhost', authorization: 'Bearer invalid-token' },
            socket: { remoteAddress: '127.0.0.1' }
        } as any;
        let status = 0;
        const res = {
            writeHead: (code: number) => {
                status = code;
                return res;
            },
            end: () => res,
            setHeader: () => {}
        } as any;

        await (server as any).handleRequest(req, res);
        expect(handled).toBe(false);
        expect(status).toBe(401);
    }
}

@Suite('PairingStore')
export class PairingStoreTest {
    @Test('generates and validates pairing codes')
    pairAndValidate() {
        const store = new PairingStore();
        const code = store.generate();

        expect(code.code).toBeTruthy();
        expect(code.used).toBe(false);

        expect(store.validate(code.code)).toBe(true);
        expect(store.validate(code.code)).toBe(false);
    }
}
