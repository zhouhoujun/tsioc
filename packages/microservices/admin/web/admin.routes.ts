import { LoadComponent, Routes } from '@tsdi/components/router';
import { AdminPage } from './routing';

/** Lazy layout shell; it owns the sidebar/topbar and a child router outlet. */
const loadLayout = () => import('./admin.component').then(module => module.GatewayAdminComponent);

const loadDashboard = () => import('./pages/dashboard.page').then(module => module.GatewayAdminDashboardPageComponent);
const loadRoutes = () => import('./pages/routes.page').then(module => module.GatewayAdminRoutesPageComponent);
const loadRules = () => import('./pages/rules.page').then(module => module.GatewayAdminRulesPageComponent);
const loadNotFound = () => import('./pages/not-found.page').then(module => module.GatewayAdminNotFoundPageComponent);

function page(page: AdminPage, path: string, loadComponent: LoadComponent) {
    return { path, data: { page }, loadComponent };
}

/**
 * Admin feature routes (Angular-style nested route table).
 *
 * The layout is the route component for the authenticated root; its own
 * `<router-outlet>` renders one of the child pages below. Unknown URLs match
 * the `**` route and render the NotFound page instead of redirecting home.
 */
export const GATEWAY_ADMIN_ROUTES: Routes = [
    {
        path: '',
        loadComponent: loadLayout,
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
            page('dashboard', 'dashboard', loadDashboard),
            page('routes', 'routes', loadRoutes),
            page('rules', 'rules', loadRules),
            page('not-found', '**', loadNotFound)
        ]
    }
];
