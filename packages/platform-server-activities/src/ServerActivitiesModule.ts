import { DIModule, RegScope } from '@ts-ioc/boot';
import { ServerModule } from '@ts-ioc/platform-server';
import { ServerBootstrapModule } from '@ts-ioc/platform-server-boot';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';
import { ServerLogsModule } from '@ts-ioc/platform-server-logs';


@DIModule({
    regScope: RegScope.all,
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
