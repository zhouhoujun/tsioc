import { Routes } from '@tsdi/components/router';
import { AdminPage } from './routing';
import { GatewayAdminAuthGuard } from './auth.guard';

function page(page: AdminPage, path: string) {
    return {
        path,
        data: { page },
        canActivate: [GatewayAdminAuthGuard]
    };
}

/**
 * URL routes for the admin shell. The shell itself remains a single component;
 * the router owns URL matching, guards and navigation events, while page state
 * is projected from `snapshot.data.page`.
 */
export const GATEWAY_ADMIN_ROUTES: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    page('dashboard', 'dashboard'),
    page('routes', 'routes'),
    page('rules', 'rules'),
    { path: '**', redirectTo: '/dashboard' }
];
