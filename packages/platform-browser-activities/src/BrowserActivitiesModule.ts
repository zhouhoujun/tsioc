import { Module } from '@tsdi/ioc';
import { BrowserModule } from '@tsdi/platform-browser';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';

@Module({
    imports: [
        BrowserModule
    ],
    providers: [
        TaskLogAspect,
        RunnerLogAspect
    ]
})
export class BrowserActivitiesModule {

}
