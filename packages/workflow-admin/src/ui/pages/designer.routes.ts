import { Routes } from '@tsdi/components/router';
import { WORKFLOW_ADMIN_WORKFLOW_PATH, WORKFLOW_ADMIN_WORKFLOWS_PATH } from '../routes';

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
    }
];
