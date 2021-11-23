import { Module } from '@tsdi/core';
import { ParallelExecutor } from '@tsdi/activities';
import { ServerBootstrapModule, ServerLogsModule } from '@tsdi/platform-server';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';
import { ServerParallelExecutor } from './ServerParallelExecutor';


@Module({
    imports: [
        ServerBootstrapModule,
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
