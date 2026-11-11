import expect = require('expect');
import { adminRouteHash, buildAdminLoginUrl, parseAdminRoute } from '../web/routing';
import { GatewayAdminAuthGuard } from '../web/auth.guard';
import { adminUnauthorizedInterceptor } from '../web/http';
import { lastValueFrom, throwError } from 'rxjs';

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
        const guard = new GatewayAdminAuthGuard({
            session: async () => ({ ok: false, status: 401 })
        } as any);
        expect(await guard.canActivate()).toBe(false);

        const missingUser = new GatewayAdminAuthGuard({
            session: async () => ({ ok: true, status: 200, body: { authenticated: true, authEnabled: true, user: null } })
        } as any);
        expect(await missingUser.canActivate()).toBe(false);

        const allowed = new GatewayAdminAuthGuard({
            session: async () => ({ ok: true, status: 200, body: { authenticated: true, authEnabled: false, user: null } })
        } as any);
        expect(await allowed.canActivate()).toBe(true);
    });

    it('redirects to the login page from the HTTP 401 interceptor', async () => {
        const original = (globalThis as any).window;
        let target = '';
        const location = {
            href: 'http://localhost/admin/#/rules',
            pathname: '/admin/',
            search: '',
            hash: '#/rules',
            replace(url: string) { target = url; },
            assign(url: string) { target = url; }
        };
        (globalThis as any).window = { location };
        try {
            await lastValueFrom((adminUnauthorizedInterceptor as any)(
                { url: '/api/gateway-admin/routes' } as any,
                () => throwError(() => ({ status: 401 })),
                {} as any
            )).catch(() => undefined);
            expect(target).toContain('/admin/login.html?redirect=');
            expect(target).toContain('%23%2Frules');

            target = '';
            await lastValueFrom((adminUnauthorizedInterceptor as any)(
                { url: '/api/gateway-admin/routes' } as any,
                () => throwError(() => ({ status: 500 })),
                {} as any
            )).catch(() => undefined);
            expect(target).toBe('');
        } finally {
            (globalThis as any).window = original;
        }
    });

    it('builds a safe login redirect for the route guard', () => {
        expect(buildAdminLoginUrl('/admin/#/rules')).toBe('/admin/login.html?redirect=%2Fadmin%2F%23%2Frules');
        expect(buildAdminLoginUrl('/evil')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
        expect(buildAdminLoginUrl('//evil.example')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
    });
});
