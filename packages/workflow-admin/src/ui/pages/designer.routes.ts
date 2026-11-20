import { Routes } from '@tsdi/components/router';
import {
    WORKFLOW_ADMIN_AUDIT_PATH,
    WORKFLOW_ADMIN_PLUGINS_PATH,
    WORKFLOW_ADMIN_SESSIONS_PATH,
    WORKFLOW_ADMIN_WORKFLOW_PATH,
    WORKFLOW_ADMIN_WORKFLOWS_PATH
} from '../routes';

/** Lazy route module for the designer feature area. */
export const WORKFLOW_DESIGNER_ROUTES: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: WORKFLOW_ADMIN_WORKFLOWS_PATH
    },
    {
        path: WORKFLOW_ADMIN_WORKFLOWS_PATH,
        loadComponent: () => import('./designer.page').then(module => module.WorkflowAdminDesignerPageComponent)
    },
    {
        path: WORKFLOW_ADMIN_WORKFLOW_PATH,
        loadComponent: () => import('./designer.page').then(module => module.WorkflowAdminDesignerPageComponent)
    },
    {
        path: WORKFLOW_ADMIN_PLUGINS_PATH,
        loadComponent: () => import('./plugins.page').then(module => module.WorkflowAdminPluginsPageComponent)
    },
    {
        path: WORKFLOW_ADMIN_SESSIONS_PATH,
        loadComponent: () => import('./sessions.page').then(module => module.WorkflowAdminSessionsPageComponent)
    },
    {
        path: WORKFLOW_ADMIN_AUDIT_PATH,
        loadComponent: () => import('./audit.page').then(module => module.WorkflowAdminAuditPageComponent)
    }
];
