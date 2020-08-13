import { DIModule } from '@tsdi/boot';
import { ParallelExecutor } from '@tsdi/activities';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLogsModule } from '@tsdi/platform-server-logs';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';
import { ServerParallelExecutor } from './ServerParallelExecutor';


@DIModule({
    regIn: 'root',
    imports: [
        ServerModule,
        ServerLogsModule
    ],
    providers: [
        RunnerLogAspect,
        TaskLogAspect,
        ServerParallelExecutor,
        ServerBootstrapModule,
        { provide: ParallelExecutor, useExisting: ServerParallelExecutor }
    ]
})
export class ServerActivitiesModule {

}
