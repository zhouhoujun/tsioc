import { DIModule } from '@ts-ioc/bootstrap';
import { ServerModule } from '@ts-ioc/platform-server';
import { ServerBootstrapModule } from '@ts-ioc/platform-server-bootstrap';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';


@DIModule({
    imports: [
        ServerModule,
        ServerBootstrapModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ],
    exports: [
        ServerBootstrapModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ]
})
export class ServerActivitiesModule {

}
