import expect = require('expect');
import {
    createWorkflowAdminRoutes,
    WORKFLOW_ADMIN_AUDIT_PATH,
    WORKFLOW_ADMIN_LOGIN_PATH,
    WORKFLOW_ADMIN_PLUGINS_PATH,
    WORKFLOW_ADMIN_SESSIONS_PATH,
    WORKFLOW_ADMIN_WORKFLOWS_PATH
} from '../src/ui/routes';
import { WORKFLOW_DESIGNER_ROUTES } from '../src/ui/pages/designer.routes';
import { WorkflowAdminNotFoundPageComponent } from '../src/ui/pages/not-found.page';
import { WorkflowAdminPluginsPageComponent } from '../src/ui/pages/plugins.page';
import { WorkflowAdminSessionsPageComponent } from '../src/ui/pages/sessions.page';
import { WorkflowAdminAuditPageComponent } from '../src/ui/pages/audit.page';

describe('workflow admin routes', () => {
    it('attaches the designer guard only when authentication is enabled', () => {
        for (const authEnabled of [true, false]) {
            const routes = createWorkflowAdminRoutes(authEnabled);
            const designer = routes.find(entry => entry.path === '');
            expect(designer).toBeTruthy();
            expect(designer?.canActivate?.length ?? 0).toBe(authEnabled ? 1 : 0);
            expect(typeof designer?.loadChildren).toBe('function');

            const login = routes.find(entry => entry.path === WORKFLOW_ADMIN_LOGIN_PATH);
            expect(login).toBeTruthy();
            expect(login?.canActivate?.length ?? 0).toBe(0);
        }
    });

    it('lands on the canonical workflows path', () => {
        const landing = WORKFLOW_DESIGNER_ROUTES.find(route => route.path === '' && route.pathMatch === 'full');
        expect(landing?.redirectTo).toBe(WORKFLOW_ADMIN_WORKFLOWS_PATH);

        const workflows = WORKFLOW_DESIGNER_ROUTES.find(route => route.path === WORKFLOW_ADMIN_WORKFLOWS_PATH);
        expect(typeof workflows?.loadComponent).toBe('function');
    });

    it('exposes the plugins, sessions and audit pages as lazy routes', async () => {
        const expected: Array<[string, any]> = [
            [WORKFLOW_ADMIN_PLUGINS_PATH, WorkflowAdminPluginsPageComponent],
            [WORKFLOW_ADMIN_SESSIONS_PATH, WorkflowAdminSessionsPageComponent],
            [WORKFLOW_ADMIN_AUDIT_PATH, WorkflowAdminAuditPageComponent]
        ];
        for (const [path, type] of expected) {
            const route = WORKFLOW_DESIGNER_ROUTES.find(entry => entry.path === path);
            expect(route).toBeTruthy();
            expect(typeof route?.loadComponent).toBe('function');
            expect(await route!.loadComponent!()).toBe(type);
        }
    });

    it('maps wildcard routes to the lazy NotFound page', async () => {
        const wildcard = createWorkflowAdminRoutes(false).find(route => route.path === '**');
        expect(wildcard).toBeTruthy();
        expect(wildcard?.data?.notFound).toBe(true);
        expect(typeof wildcard?.loadComponent).toBe('function');
        expect(await wildcard!.loadComponent!()).toBe(WorkflowAdminNotFoundPageComponent);
    });
});
