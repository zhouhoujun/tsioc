import { DIModule } from '@ts-ioc/boot';
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
})
export class BrowserActivitiesModule {

}
