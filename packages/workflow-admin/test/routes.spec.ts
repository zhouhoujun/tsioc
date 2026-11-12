import expect = require('expect');
import {
    createWorkflowAdminRoutes,
    WORKFLOW_ADMIN_ADMIN_PATH,
    WORKFLOW_ADMIN_PREVIEW_PATH
} from '../src/ui/routes';
import { WORKFLOW_DESIGNER_ROUTES } from '../src/ui/pages/designer.routes';
import { WorkflowAdminNotFoundPageComponent } from '../src/ui/pages/not-found.page';

describe('workflow admin routes', () => {
    it('adds designer route guards only when authentication is enabled', () => {
        for (const authEnabled of [true, false]) {
            const routes = createWorkflowAdminRoutes(authEnabled);
            for (const path of [WORKFLOW_ADMIN_PREVIEW_PATH, WORKFLOW_ADMIN_ADMIN_PATH]) {
                const route = routes.find(entry => entry.path === path);
                expect(route).toBeTruthy();
                expect(route?.canActivate?.length ?? 0).toBe(authEnabled ? 1 : 0);
                expect(typeof route?.loadChildren).toBe('function');
            }
        }

        const landing = WORKFLOW_DESIGNER_ROUTES.find(route => route.path === '' && route.pathMatch === 'full');
        expect(typeof landing?.loadComponent).toBe('function');

        const root = createWorkflowAdminRoutes(true).find(route => route.path === '' && route.pathMatch === 'full');
        expect(root?.redirectTo).toBe(WORKFLOW_ADMIN_ADMIN_PATH);
    });

    it('maps wildcard routes to the lazy NotFound page', async () => {
        const wildcard = createWorkflowAdminRoutes(false).find(route => route.path === '**');
        expect(wildcard).toBeTruthy();
        expect(wildcard?.data?.notFound).toBe(true);
        expect(typeof wildcard?.loadComponent).toBe('function');
        expect(await wildcard!.loadComponent!()).toBe(WorkflowAdminNotFoundPageComponent);
    });
});
