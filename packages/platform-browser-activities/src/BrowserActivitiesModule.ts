import { DIModule } from '@ts-ioc/bootstrap';
import { BrowserModule } from '@ts-ioc/platform-browser';
import { TaskLogAspect, RunnerLogAspect } from './aop';
import { WorkflowConfigureRegister } from './WorkflowConfigureRegister';

@DIModule({
    asRoot: true,
    imports: [
        BrowserModule,
        TaskLogAspect,
        RunnerLogAspect,
        WorkflowConfigureRegister
    ]
    // exports: [
    //     BrowserModule,
    //     TaskLogAspect,
    //     RunnerLogAspect,
    //     WorkflowConfigureRegister
    // ]
})
export class BrowserActivitiesModule {

}
