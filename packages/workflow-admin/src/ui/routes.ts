import { Route, Routes } from '@tsdi/components/router';
import { WorkflowAdminAuthGuard } from './auth.guard';

export const WORKFLOW_ADMIN_LOGIN_PATH = 'login';
/** Canonical designer landing area (no specific document selected). */
export const WORKFLOW_ADMIN_WORKFLOWS_PATH = 'workflows';
export const WORKFLOW_ADMIN_WORKFLOW_PATH = 'workflows/:id';
/** Standalone admin feature pages. */
export const WORKFLOW_ADMIN_PLUGINS_PATH = 'plugins';
export const WORKFLOW_ADMIN_SESSIONS_PATH = 'sessions';
export const WORKFLOW_ADMIN_AUDIT_PATH = 'audit';

/**
 * Root Angular-style route configuration.
 *
 * The guard is attached to the designer route only when authentication is
 * enabled. With auth disabled the same route table renders without any guard
 * (and without `/auth/token`/`/auth/userinfo` probes).
 */
export function createWorkflowAdminRoutes(authEnabled: boolean): Routes {
    const designer: Route = {
        path: '',
        loadChildren: () => import('./pages/designer.routes').then(module => module.WORKFLOW_DESIGNER_ROUTES)
    };
    return [
        {
            path: WORKFLOW_ADMIN_LOGIN_PATH,
            loadComponent: () => import('./pages/login.page').then(module => module.WorkflowAdminLoginPageComponent)
        },
        authEnabled ? { ...designer, canActivate: [WorkflowAdminAuthGuard] } : designer,
        {
            path: '**',
            data: { public: true, notFound: true },
            loadComponent: () => import('./pages/not-found.page').then(module => module.WorkflowAdminNotFoundPageComponent)
        }
    ];
}

/** Default route table (guarded); hosts choose via `createWorkflowAdminRoutes`. */
export const WORKFLOW_ADMIN_ROUTES: Routes = createWorkflowAdminRoutes(true);
