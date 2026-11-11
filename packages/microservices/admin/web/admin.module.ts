import { Module } from '@tsdi/ioc';
import { WorkflowDesignerModule, WorkflowNodeRegistry } from '@tsdi/activities/visual';
import { registerGatewayRuleNodes } from '../src/rules';
import { GatewayAdminComponent } from './admin.component';

@Module({
    imports: [WorkflowDesignerModule],
    declarations: [GatewayAdminComponent],
    providers: [{
        provide: WorkflowNodeRegistry,
        useFactory: () => registerGatewayRuleNodes(new WorkflowNodeRegistry())
    }]
})
export class GatewayAdminAppModule {}
