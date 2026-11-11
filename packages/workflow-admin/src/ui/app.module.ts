import { Module } from '@tsdi/ioc';
import { RouterModule } from '@tsdi/components/router';
import { provideHttpClient, withFetch, withInterceptors, withNoXsrfProtection } from '@tsdi/common/http';
import { WorkflowDesignerModule } from '@tsdi/activities/src/workflow-designer.module';
import { WorkflowCodeEditorModule } from '@tsdi/activities/web';
import { WorkflowAdminAuthGuard, WORKFLOW_ADMIN_LOGIN_ROUTE } from './auth.guard';
import { WORKFLOW_ADMIN_LOGIN_PATH, WORKFLOW_ADMIN_ROUTES } from './routes';
import { workflowAdminUnauthorizedInterceptor } from './http';

/**
 * Angular-style application module: router configuration, lazy feature
 * routes, the session guard and the framework HTTP client.
 */
@Module({
    imports: [
        WorkflowDesignerModule,
        WorkflowCodeEditorModule,
        RouterModule.forRoot(WORKFLOW_ADMIN_ROUTES)
    ],
    providers: [
        ...provideHttpClient(withFetch(), withNoXsrfProtection(), withInterceptors([workflowAdminUnauthorizedInterceptor])),
        WorkflowAdminAuthGuard,
        { provide: WORKFLOW_ADMIN_LOGIN_ROUTE, useValue: WORKFLOW_ADMIN_LOGIN_PATH }
    ]
})
export class WorkflowAdminAppModule { }
