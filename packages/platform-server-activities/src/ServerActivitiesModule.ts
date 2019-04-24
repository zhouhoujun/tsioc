import { DIModule, RegScope } from '@tsdi/boot';
import { ServerModule } from '@tsdi/platform-server';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';
import { ServerLogsModule } from '@tsdi/platform-server-logs';


@DIModule({
    regScope: RegScope.boot,
    imports: [
        ServerModule,
        ServerBootstrapModule,
        ServerLogsModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ]
})
export class ServerActivitiesModule {

}
