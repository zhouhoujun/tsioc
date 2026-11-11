import expect = require('expect');
import { WORKFLOW_ADMIN_ROUTES } from '../src/ui/routes';
import { WorkflowAdminNotFoundPageComponent } from '../src/ui/pages/not-found.page';

describe('workflow admin routes', () => {
    it('maps wildcard routes to the lazy NotFound page', async () => {
        const wildcard = WORKFLOW_ADMIN_ROUTES.find(route => route.path === '**');
        expect(wildcard).toBeTruthy();
        expect(wildcard?.data?.notFound).toBe(true);
        expect(typeof wildcard?.loadComponent).toBe('function');
        expect(await wildcard!.loadComponent!()).toBe(WorkflowAdminNotFoundPageComponent);
    });
});
