import { Routes } from '@tsdi/components/router';
import { WorkflowAdminAuthGuard } from './auth.guard';

export const WORKFLOW_ADMIN_LOGIN_PATH = 'login';
/** Public/open designer area (used when authentication is disabled). */
export const WORKFLOW_ADMIN_PREVIEW_PATH = 'preview';
/** Authenticated designer area (used when authentication is enabled). */
export const WORKFLOW_ADMIN_ADMIN_PATH = 'admin';
/** Canonical landing area for the designer (no specific document selected). */
export const WORKFLOW_ADMIN_WORKFLOWS_PATH = 'workflows';
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
        path: WORKFLOW_ADMIN_PREVIEW_PATH,
        canActivate: [WorkflowAdminAuthGuard],
        loadChildren: () => import('./pages/designer.routes').then(module => module.WORKFLOW_DESIGNER_ROUTES)
    },
    {
        path: WORKFLOW_ADMIN_ADMIN_PATH,
        canActivate: [WorkflowAdminAuthGuard],
        loadChildren: () => import('./pages/designer.routes').then(module => module.WORKFLOW_DESIGNER_ROUTES)
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: WORKFLOW_ADMIN_PREVIEW_PATH
    },
    {
        path: '**',
        data: { public: true, notFound: true },
        loadComponent: () => import('./pages/not-found.page').then(module => module.WorkflowAdminNotFoundPageComponent)
    }
];
