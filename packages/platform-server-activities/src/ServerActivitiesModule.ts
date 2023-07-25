import { Module } from '@tsdi/ioc';
import { ParallelExecutor } from '@tsdi/activities';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLogsModule } from '@tsdi/platform-server/log4js';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';
import { ServerParallelExecutor } from './ServerParallelExecutor';


@Module({
    imports: [
        ServerModule,
        ServerLogsModule
    ],
    providers: [
        RunnerLogAspect,
        TaskLogAspect,
        ServerParallelExecutor,
        { provide: ParallelExecutor, useExisting: ServerParallelExecutor }
    ]
})
export class ServerActivitiesModule {

}
