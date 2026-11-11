import { Module } from '@tsdi/ioc';
import { WorkflowDesignerModule, WorkflowNodeRegistry } from '@tsdi/activities/visual';
import { RouterModule } from '@tsdi/components/router';
import { provideHttpClient, withFetch, withNoXsrfProtection } from '@tsdi/common/http';
import { GatewayAdminAuthGuard } from './auth.guard';
import { GatewayAdminHttp } from './http';
import { registerGatewayRuleNodes } from '../src/rules';
import { GatewayAdminComponent } from './admin.component';

@Module({
    imports: [
        WorkflowDesignerModule,
        RouterModule.forRoot([{
            path: '',
            loadChildren: () => import('./admin.routes').then(module => module.GATEWAY_ADMIN_ROUTES)
        }])
    ],
    declarations: [GatewayAdminComponent],
    providers: [
        ...provideHttpClient(withFetch(), withNoXsrfProtection()),
        GatewayAdminHttp,
        GatewayAdminAuthGuard,
        {
        provide: WorkflowNodeRegistry,
        useFactory: () => registerGatewayRuleNodes(new WorkflowNodeRegistry())
    }]
})
export class GatewayAdminAppModule {}
