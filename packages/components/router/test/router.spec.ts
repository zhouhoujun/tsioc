import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Router } from '../src';

@Suite('router matching and navigation')
export class RouterTest {
    @Test('matches static, parameter, nested and wildcard routes')
    async matchesRoutes() {
        const router = new Router([
            { path: '', data: { page: 'home' } },
            { path: 'users/:id', data: { page: 'user' } },
            { path: 'admin', children: [{ path: 'reports/:year', data: { page: 'reports' } }] },
            { path: '**', data: { page: 'missing' } }
        ], '/');
        expect(router.activeRoute?.data.page).toEqual('home');

        expect(await router.navigateByUrl('/users/42')).toBe(true);
        expect(router.url).toEqual('/users/42');
        expect(router.params).toEqual({ id: '42' });
        expect(router.data.page).toEqual('user');

        expect(await router.navigateByUrl('/admin/reports/2026')).toBe(true);
        expect(router.params).toEqual({ year: '2026' });
        expect(router.activeRoute?.children[0]?.data.page).toEqual('reports');

        expect(await router.navigateByUrl('/does/not/exist')).toBe(true);
        expect(router.data.page).toEqual('missing');
    }

    @Test('follows redirects and emits navigation events')
    async redirects() {
        const router = new Router([
            { path: '', redirectTo: '/home' },
            { path: 'home', data: { page: 'home' } }
        ]);
        const events: string[] = [];
        router.events.subscribe(event => events.push(event?.type || ''));
        expect(await router.navigateByUrl('/')).toBe(true);
        expect(router.url).toEqual('/home');
        expect(events).toContain('NavigationStart');
        expect(events).toContain('NavigationEnd');
    }

    @Test('cancels navigation when a guard rejects')
    async guards() {
        let allowed = false;
        const router = new Router([
            { path: 'secure', canActivate: [() => allowed] },
            { path: 'open' }
        ], '/open');
        expect(await router.navigateByUrl('/secure')).toBe(false);
        expect(router.url).toEqual('/open');
        allowed = true;
        expect(await router.navigateByUrl('/secure')).toBe(true);
        expect(router.url).toEqual('/secure');
    }

    @Test('loads lazy components and child route modules')
    async lazyRoutes() {
        let componentLoaded = 0;
        let childrenLoaded = 0;
        class LazyPage {}
        const router = new Router([
            {
                path: 'lazy',
                loadComponent: async () => { componentLoaded++; return LazyPage; }
            },
            {
                path: 'admin',
                loadChildren: async () => {
                    childrenLoaded++;
                    return [{ path: 'reports', data: { page: 'reports' } }];
                }
            }
        ], '/');
        expect(await router.navigateByUrl('/lazy')).toBe(true);
        expect(router.activeRoute?.route.component).toBe(LazyPage);
        expect(await router.navigateByUrl('/lazy')).toBe(true);
        expect(componentLoaded).toBe(1);
        expect(await router.navigateByUrl('/admin/reports')).toBe(true);
        expect(router.data.page).toBe('reports');
        expect(childrenLoaded).toBe(1);
    }

    @Test('serializes query params and fragment into the next url')
    async queryParams() {
        const router = new Router([{ path: 'search' }]);
        expect(await router.navigate(['/search'], { queryParams: { q: 'router', page: 2 }, fragment: 'top' })).toBe(true);
        expect(router.url).toEqual('/search?q=router&page=2#top');
    }

    @Test('isActive supports exact and prefix matching')
    checkActive() {
        const router = new Router([{ path: 'users' }], '/users/42');
        expect(router.isActive('/users')).toBe(true);
        expect(router.isActive('/users', true)).toBe(false);
        expect(router.isActive('/users/42', true)).toBe(true);
    }
}
