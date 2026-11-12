import expect = require('expect');
import {
    WORKFLOW_ADMIN_ADMIN_PATH,
    WORKFLOW_ADMIN_PREVIEW_PATH,
    WORKFLOW_ADMIN_ROUTES
} from '../src/ui/routes';
import { WORKFLOW_DESIGNER_ROUTES } from '../src/ui/pages/designer.routes';
import { WorkflowAdminNotFoundPageComponent } from '../src/ui/pages/not-found.page';

describe('workflow admin routes', () => {
    it('exposes guarded preview and admin designer areas', () => {
        for (const path of [WORKFLOW_ADMIN_PREVIEW_PATH, WORKFLOW_ADMIN_ADMIN_PATH]) {
            const route = WORKFLOW_ADMIN_ROUTES.find(entry => entry.path === path);
            expect(route).toBeTruthy();
            expect(route?.canActivate?.length).toBe(1);
            expect(typeof route?.loadChildren).toBe('function');
        }

        const landing = WORKFLOW_DESIGNER_ROUTES.find(route => route.path === '' && route.pathMatch === 'full');
        expect(typeof landing?.loadComponent).toBe('function');
    });

    it('maps wildcard routes to the lazy NotFound page', async () => {
        const wildcard = WORKFLOW_ADMIN_ROUTES.find(route => route.path === '**');
        expect(wildcard).toBeTruthy();
        expect(wildcard?.data?.notFound).toBe(true);
        expect(typeof wildcard?.loadComponent).toBe('function');
        expect(await wildcard!.loadComponent!()).toBe(WorkflowAdminNotFoundPageComponent);
    });
});
