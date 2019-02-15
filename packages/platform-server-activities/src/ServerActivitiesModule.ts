import { DIModule } from '@ts-ioc/bootstrap';
import { ServerModule } from '@ts-ioc/platform-server';
import { ServerBootstrapModule } from '@ts-ioc/platform-server-bootstrap';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';
import { ServerLogsModule } from '@ts-ioc/platform-server-logs';


@DIModule({
    asRoot: true,
    imports: [
        ServerModule,
        ServerBootstrapModule,
        ServerLogsModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ]
    // exports: [
    //     ServerModule,
    //     ServerBootstrapModule,
    //     ServerLogsModule,
    //     TaskLogAspect,
    //     RunnerLogAspect,
    //     WorkflowConfigureRegister
    // ]
})
export class ServerActivitiesModule {

}
