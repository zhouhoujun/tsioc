import { Route, Routes } from '@tsdi/components/router';
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
 * Guards are attached to the designer areas only when authentication is
 * enabled. With auth disabled the same routes render without any guard (and
 * without `/auth/token`/`/auth/userinfo` probes).
 */
export function createWorkflowAdminRoutes(authEnabled: boolean): Routes {
    const designerRoute = (path: string): Route => {
        const route: Route = {
            path,
            loadChildren: () => import('./pages/designer.routes').then(module => module.WORKFLOW_DESIGNER_ROUTES)
        };
        return authEnabled
            ? { ...route, canActivate: [WorkflowAdminAuthGuard] }
            : route;
    };
    return [
        {
            path: WORKFLOW_ADMIN_LOGIN_PATH,
            loadComponent: () => import('./pages/login.page').then(module => module.WorkflowAdminLoginPageComponent)
        },
        designerRoute(WORKFLOW_ADMIN_PREVIEW_PATH),
        designerRoute(WORKFLOW_ADMIN_ADMIN_PATH),
        {
            path: '',
            pathMatch: 'full',
            redirectTo: WORKFLOW_ADMIN_ADMIN_PATH
        },
        {
            path: '**',
            data: { public: true, notFound: true },
            loadComponent: () => import('./pages/not-found.page').then(module => module.WorkflowAdminNotFoundPageComponent)
        }
    ];
}

/** Default route table (guarded); hosts choose via `createWorkflowAdminRoutes`. */
export const WORKFLOW_ADMIN_ROUTES: Routes = createWorkflowAdminRoutes(true);
