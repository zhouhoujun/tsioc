import { Module } from '@tsdi/ioc';
import { WorkflowDesignerModule, WorkflowNodeRegistry } from '@tsdi/activities/visual';
import { RouterModule, Routes } from '@tsdi/components/router';
import { provideHttpClient, withFetch, withInterceptors, withNoXsrfProtection } from '@tsdi/common/http';
import { GatewayAdminAuthGuard } from './auth.guard';
import { adminUnauthorizedInterceptor, GatewayAdminHttp } from './http';
import { registerGatewayRuleNodes } from '../src/rules';

/**
 * Root route table (Angular `AppRoutingModule`). The root component is only a
 * `router-outlet`; protected pages are loaded dynamically from `admin.routes`
 * so the auth guard runs before any page component is created.
 */
export const GATEWAY_ADMIN_ROOT_ROUTES: Routes = [
    {
        path: '',
        canActivate: [GatewayAdminAuthGuard],
        loadChildren: () => import('./admin.routes').then(module => module.GATEWAY_ADMIN_ROUTES)
    }
];

@Module({
    imports: [
        WorkflowDesignerModule,
        RouterModule.forRoot(GATEWAY_ADMIN_ROOT_ROUTES)
    ],
    providers: [
        ...provideHttpClient(withFetch(), withNoXsrfProtection(), withInterceptors([adminUnauthorizedInterceptor])),
        GatewayAdminHttp,
        GatewayAdminAuthGuard,
        {
            provide: WorkflowNodeRegistry,
            useFactory: () => registerGatewayRuleNodes(new WorkflowNodeRegistry())
        }
    ]
})
export class GatewayAdminAppModule {}
