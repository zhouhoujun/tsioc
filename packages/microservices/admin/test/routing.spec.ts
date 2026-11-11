import expect = require('expect');
import { adminRouteHash, buildAdminLoginUrl, parseAdminRoute } from '../web/routing';
import { GatewayAdminAuthGuard } from '../web/auth.guard';

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
            state: async () => ({ ok: false, status: 401 })
        } as any);
        expect(await guard.canActivate()).toBe(false);

        const allowed = new GatewayAdminAuthGuard({
            state: async () => ({ ok: true, status: 200, body: { auth: { enabled: false } } })
        } as any);
        expect(await allowed.canActivate()).toBe(true);
    });

    it('builds a safe login redirect for the route guard', () => {
        expect(buildAdminLoginUrl('/admin/#/rules')).toBe('/admin/login.html?redirect=%2Fadmin%2F%23%2Frules');
        expect(buildAdminLoginUrl('/evil')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
        expect(buildAdminLoginUrl('//evil.example')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
    });
});
