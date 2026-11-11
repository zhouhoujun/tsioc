import expect = require('expect');
import { lastValueFrom, Observable, throwError } from 'rxjs';
import { adminRouteHash, buildAdminLoginUrl, parseAdminRoute } from '../web/routing';
import { GatewayAdminAuthGuard, GatewayAdminBootstrapSession } from '../web/auth.guard';
import { adminUnauthorizedInterceptor } from '../web/http';

interface UnauthorizedRequest {
    url: string;
}

type TestInterceptor = (
    request: UnauthorizedRequest,
    next: () => Observable<never>,
    context: unknown
) => Observable<unknown>;

const globals = globalThis as unknown as { __TSDI_ADMIN_SESSION__?: GatewayAdminBootstrapSession };

function withSession<T>(session: GatewayAdminBootstrapSession | undefined, run: () => T): T {
    const original = globals.__TSDI_ADMIN_SESSION__;
    globals.__TSDI_ADMIN_SESSION__ = session;
    try {
        return run();
    } finally {
        globals.__TSDI_ADMIN_SESSION__ = original;
    }
}

describe('gateway admin UI routing', () => {
    it('parses dashboard/routes/rules hashes', () => {
        expect(parseAdminRoute('')).toBe('dashboard');
        expect(parseAdminRoute('#/dashboard')).toBe('dashboard');
        expect(parseAdminRoute('#/routes')).toBe('routes');
        expect(parseAdminRoute('#/rules')).toBe('rules');
        expect(parseAdminRoute('#/unknown')).toBe('dashboard');
    });

    it('serializes page hashes', () => {
        expect(adminRouteHash('dashboard')).toBe('#/dashboard');
        expect(adminRouteHash('routes')).toBe('#/routes');
        expect(adminRouteHash('rules')).toBe('#/rules');
    });

    it('requires the server-bootstrapped session user', () => {
        const guard = new GatewayAdminAuthGuard();
        expect(withSession(undefined, () => guard.canActivate())).toBe(false);
        expect(withSession({ authenticated: true, authEnabled: true, user: null }, () => guard.canActivate())).toBe(false);
        expect(withSession({ authenticated: true, authEnabled: true, user: { email: 'admin@example.com' } }, () => guard.canActivate())).toBe(true);
        expect(withSession({ authenticated: true, authEnabled: false, user: null }, () => guard.canActivate())).toBe(true);
    });

    it('redirects to the login page from the HTTP 401 interceptor', async () => {
        const globals = globalThis as unknown as { window?: { location?: Location } };
        const original = globals.window;
        let target = '';
        const location = {
            href: 'http://localhost/admin/#/rules',
            pathname: '/admin/',
            search: '',
            hash: '#/rules',
            replace(url: string) { target = url; },
            assign(url: string) { target = url; }
        };
        globals.window = { location: location as unknown as Location };
        const interceptor = adminUnauthorizedInterceptor as unknown as TestInterceptor;
        try {
            await lastValueFrom(interceptor(
                { url: '/api/gateway-admin/routes' },
                () => throwError(() => ({ status: 401 })),
                {}
            )).catch(() => undefined);
            expect(target).toContain('/admin/login.html?redirect=');
            expect(target).toContain('%23%2Frules');

            target = '';
            await lastValueFrom(interceptor(
                { url: '/api/gateway-admin/routes' },
                () => throwError(() => ({ status: 500 })),
                {}
            )).catch(() => undefined);
            expect(target).toBe('');
        } finally {
            globals.window = original;
        }
    });

    it('builds a safe login redirect for the route guard', () => {
        expect(buildAdminLoginUrl('/admin/#/rules')).toBe('/admin/login.html?redirect=%2Fadmin%2F%23%2Frules');
        expect(buildAdminLoginUrl('/evil')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
        expect(buildAdminLoginUrl('//evil.example')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
    });
});
