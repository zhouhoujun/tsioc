import expect = require('expect');
import { lastValueFrom, Observable, throwError } from 'rxjs';
import { adminRouteHash, buildAdminLoginUrl, parseAdminRoute } from '../web/routing';
import { GatewayAdminAuthGuard } from '../web/auth.guard';
import { AdminHttpResult, GatewayAdminHttp, adminUnauthorizedInterceptor } from '../web/http';

type SessionResult = AdminHttpResult<{ authenticated?: boolean; user?: unknown; authEnabled?: boolean }>;

interface UnauthorizedRequest {
    url: string;
}

type TestInterceptor = (
    request: UnauthorizedRequest,
    next: () => Observable<never>,
    context: unknown
) => Observable<unknown>;

function createGuard(session: () => Promise<SessionResult>): GatewayAdminAuthGuard {
    return new GatewayAdminAuthGuard({ session } as unknown as GatewayAdminHttp);
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

    it('rejects protected routes when the admin API returns 401', async () => {
        const guard = createGuard(async () => ({ ok: false, status: 401 }));
        expect(await guard.canActivate()).toBe(false);

        const missingUser = createGuard(async () => ({
            ok: true,
            status: 200,
            body: { authenticated: true, authEnabled: true, user: null }
        }));
        expect(await missingUser.canActivate()).toBe(false);

        const allowed = createGuard(async () => ({
            ok: true,
            status: 200,
            body: { authenticated: true, authEnabled: false, user: null }
        }));
        expect(await allowed.canActivate()).toBe(true);
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
