import { DIModule, RegScope } from '@tsdi/boot';
import { BrowserModule } from '@tsdi/platform-browser';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';

@DIModule({
    regScope: RegScope.boot,
    imports: [
        BrowserModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ]
})
export class BrowserActivitiesModule {

}
