import { Routes } from '@tsdi/components/router';
import { AdminPage } from './routing';

/** Lazily resolve the page component registered for the admin shell routes. */
const loadAdminPage = () => import('./admin.component').then(module => module.GatewayAdminComponent);

function page(page: AdminPage, path: string) {
    return {
        path,
        data: { page },
        // Angular-style `loadComponent`: the router resolves the registered
        // component for the matched route instead of the shell owning all pages.
        loadComponent: loadAdminPage
    };
}

/**
 * URL routes for the admin shell. Every page resolves its own component
 * dynamically; the authenticated parent route applies `GatewayAdminAuthGuard`
 * before any page component is created.
 */
export const GATEWAY_ADMIN_ROUTES: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    page('dashboard', 'dashboard'),
    page('routes', 'routes'),
    page('rules', 'rules'),
    { path: '**', redirectTo: '/dashboard' }
];
