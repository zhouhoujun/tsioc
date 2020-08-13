import { DIModule } from '@tsdi/boot';
import { BrowserModule } from '@tsdi/platform-browser';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';

@DIModule({
    regIn: 'root',
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
