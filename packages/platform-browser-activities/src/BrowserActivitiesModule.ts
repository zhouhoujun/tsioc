import { Module } from '@tsdi/core';
import { BrowserBootstrapModule } from '@tsdi/platform-browser';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';

@Module({
    imports: [
        BrowserBootstrapModule
    ],
    providers: [
        TaskLogAspect,
        RunnerLogAspect
    ]
})
export class BrowserActivitiesModule {

}
