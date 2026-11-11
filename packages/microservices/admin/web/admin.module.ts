import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { RouterModule, Routes } from '@tsdi/components/router';
import { provideHttpClient, withFetch, withInterceptors, withNoXsrfProtection } from '@tsdi/common/http';
import { GatewayAdminAuthGuard } from './auth.guard';
import { adminUnauthorizedInterceptor, GatewayAdminHttp } from './http';
import { GatewayAdminState } from './admin.state';

/**
 * Root route table (Angular `AppRoutingModule`). The root component is only a
 * `router-outlet`; protected pages are loaded dynamically from `admin.routes`
 * so the auth guard runs before any page component is created.
 *
 * The designer UI stays out of this module on purpose: `GatewayAdminComponent`
 * declares `WorkflowDesignerModule` itself, so the designer (and the activity
 * engine behind it) only loads with the lazy page chunk instead of the entry.
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
        ComponentsModule,
        RouterModule.forRoot(GATEWAY_ADMIN_ROOT_ROUTES)
    ],
    providers: [
        ...provideHttpClient(withFetch(), withNoXsrfProtection(), withInterceptors([adminUnauthorizedInterceptor])),
        GatewayAdminHttp,
        GatewayAdminAuthGuard,
        GatewayAdminState
    ]
})
export class GatewayAdminAppModule {}
