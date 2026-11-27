import expect = require('expect');
import { GatewayAdminAuthInterceptor, GatewayAdminAuthService } from '../src/auth';

describe('admin CSRF origin checks', () => {
    function authService(options: any = {}) {
        return new GatewayAdminAuthService({
            mode: 'service',
            sessionSecret: 'secret',
            authServiceUrl: 'http://auth.local',
            ...options
        });
    }

    function request(headers: Record<string, string>, overrides: any = {}) {
        return {
            url: '/api/gateway-admin/routes',
            method: 'PUT',
            headers,
            socket: { remoteAddress: '127.0.0.1' },
            ...overrides
        } as any;
    }

    it('allows same-origin and origin-less API clients', () => {
        const auth = authService();
        expect(auth.isSameOrigin(request({ 'host': 'admin.local', 'origin': 'http://admin.local' }))).toBe(true);
        expect(auth.isSameOrigin(request({ host: 'admin.local' }))).toBe(true);
        expect(auth.isSameOrigin(request({
            host: 'admin.local',
            origin: 'https://admin.local',
            'x-forwarded-proto': 'https'
        }))).toBe(true);
    });

    it('rejects cross-origin and malformed origins', () => {
        const auth = authService();
        expect(auth.isSameOrigin(request({ host: 'admin.local', origin: 'http://evil.local' }))).toBe(false);
        expect(auth.isSameOrigin(request({ host: 'admin.local', origin: 'http://admin.local', 'x-forwarded-proto': 'https' }))).toBe(false);
        expect(auth.isSameOrigin(request({ host: 'admin.local', origin: 'not a url' }))).toBe(false);
    });

    it('supports explicit reverse-proxy origins', () => {
        const auth = authService({ allowedOrigins: ['https://console.example.com'] });
        expect(auth.isSameOrigin(request({
            host: 'internal.local',
            origin: 'https://console.example.com'
        }))).toBe(true);
    });

    it('blocks cross-origin mutations in the interceptor', () => {
        const stub = {
            enabled: true,
            apiPrefix: '/api/gateway-admin',
            loginPath: '/admin/auth/login',
            callbackPath: '/admin/oidc/callback',
            logoutPath: '/admin/auth/logout',
            isUiEntry: () => false,
            isSameOrigin: () => false,
            authenticate: async () => ({ sub: 'user' })
        } as any;
        const interceptor = new GatewayAdminAuthInterceptor(stub);

        expect(() => interceptor.intercept(
            request({ host: 'admin.local', origin: 'http://evil.local' }),
            { handle: () => null } as any,
            {} as any
        )).toThrow(/Cross-origin admin mutation/);

        expect(() => interceptor.intercept(
            request({ host: 'admin.local', origin: 'http://evil.local' }, { method: 'GET' }),
            { handle: () => null } as any,
            {} as any
        )).not.toThrow();
    });
});
