import expect = require('expect');
import { adminRouteHash, buildAdminLoginUrl, parseAdminRoute } from '../web/routing';

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

    it('builds a safe login redirect for the route guard', () => {
        expect(buildAdminLoginUrl('/admin/#/rules')).toBe('/admin/login.html?redirect=%2Fadmin%2F%23%2Frules');
        expect(buildAdminLoginUrl('/evil')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
        expect(buildAdminLoginUrl('//evil.example')).toBe('/admin/login.html?redirect=%2Fadmin%2F');
    });
});
