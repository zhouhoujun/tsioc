import { DIModule } from '@tsdi/boot';
import { BrowserModule } from '@tsdi/platform-browser';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';
import { TaskLogAspect } from './aop/TaskLogAspect';
import { RunnerLogAspect } from './aop/RunnerLogAspect';

@DIModule({
    regIn: 'root',
    imports: [
        BrowserModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ]
})
export class BrowserActivitiesModule {

}
