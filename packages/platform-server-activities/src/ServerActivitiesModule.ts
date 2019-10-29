import { DIModule, RegFor } from '@tsdi/boot';
import { ParallelExecutor } from '@tsdi/activities';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLogsModule } from '@tsdi/platform-server-logs';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';
import { ServerParallelExecutor } from './ServerParallelExecutor';


@DIModule({
    regFor: RegFor.boot,
    imports: [
        ServerModule,
        ServerLogsModule,
        RunnerLogAspect,
        TaskLogAspect,
        ServerParallelExecutor,
        ServerBootstrapModule,
        WorkflowConfigureRegister
    ],
    providers: [
        { provide: ParallelExecutor, useExisting: ServerParallelExecutor }
    ]
})
export class ServerActivitiesModule {

}
