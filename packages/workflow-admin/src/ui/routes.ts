import { Routes } from '@tsdi/components/router';
import { WorkflowAdminAuthGuard } from './auth.guard';

export const WORKFLOW_ADMIN_LOGIN_PATH = 'login';
export const WORKFLOW_ADMIN_WORKFLOW_PATH = 'workflows/:id';

/**
 * Root Angular-style route configuration.
 *
 * The login page and the whole designer feature area are dynamically loaded so
 * the initial shell only contains the router, guard and HTTP client.
 */
export const WORKFLOW_ADMIN_ROUTES: Routes = [
    {
        path: WORKFLOW_ADMIN_LOGIN_PATH,
        loadComponent: () => import('./pages/login.page').then(module => module.WorkflowAdminLoginPageComponent)
    },
    {
        path: '',
        canActivate: [WorkflowAdminAuthGuard],
        loadChildren: () => import('./pages/designer.routes').then(module => module.WORKFLOW_DESIGNER_ROUTES)
    },
    { path: '**', redirectTo: '/' }
];
