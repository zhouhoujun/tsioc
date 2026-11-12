import { Module } from '@tsdi/ioc';
import { RouterModule } from '@tsdi/components/router';
import { provideHttpClient, withFetch, withInterceptors, withNoXsrfProtection } from '@tsdi/common/http';
import { WorkflowDesignerModule } from '@tsdi/activities/src/workflow-designer.module';
import { WorkflowCodeEditorModule } from '@tsdi/activities/web';
import { WorkflowAdminAuthGuard, WORKFLOW_ADMIN_LOGIN_ROUTE } from './auth.guard';
import { createWorkflowAdminUnauthorizedInterceptor } from './http-interceptor';
import { createWorkflowAdminRoutes, WORKFLOW_ADMIN_LOGIN_PATH } from './routes';

/**
 * Angular-style application module: router configuration, lazy feature
 * routes, the session guard and the framework HTTP client.
 *
 * `authEnabled` comes from `/auth/config` before the app is bootstrapped, so
 * guards are only registered on the route table when authentication is on.
 */
export function createWorkflowAdminAppModule(authEnabled: boolean) {
    @Module({
        imports: [
            WorkflowDesignerModule,
            WorkflowCodeEditorModule,
            RouterModule.forRoot(createWorkflowAdminRoutes(authEnabled))
        ],
        providers: [
            ...provideHttpClient(withFetch(), withNoXsrfProtection(), withInterceptors([
                createWorkflowAdminUnauthorizedInterceptor(authEnabled)
            ])),
            WorkflowAdminAuthGuard,
            { provide: WORKFLOW_ADMIN_LOGIN_ROUTE, useValue: WORKFLOW_ADMIN_LOGIN_PATH }
        ]
    })
    class WorkflowAdminModule { }
    return WorkflowAdminModule;
}

/** Default application module (authentication enabled). */
export const WorkflowAdminAppModule = createWorkflowAdminAppModule(true);
