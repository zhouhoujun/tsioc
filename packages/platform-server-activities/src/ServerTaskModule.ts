import { DIModule } from '@ts-ioc/bootstrap';
import { ServerModule } from '@ts-ioc/platform-server';
import { ServerBootstrapModule } from '@ts-ioc/platform-server-bootstrap';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';
import { ActivityLogFormater } from './LogFormater';

@DIModule({
    imports: [
        ServerModule,
        ServerBootstrapModule,
        TaskLogAspect,
        RunnerLogAspect,
        ActivityLogFormater,
        WorkflowConfigureRegister
    ],
    exports: [
        ServerBootstrapModule,
        TaskLogAspect,
        RunnerLogAspect,
        ActivityLogFormater,
        WorkflowConfigureRegister
    ]
})
export class ServerTaskModule {

}
