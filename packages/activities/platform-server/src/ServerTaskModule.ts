import { DIModule } from '@ts-ioc/bootstrap';
import { ServerModule } from '@ts-ioc/platform-server';
import { TaskLogAspect, RunnerLogAspect } from './aop';

@DIModule({
    imports: [
        ServerModule,
        TaskLogAspect,
        RunnerLogAspect
    ],
    exports: [
        ServerModule,
        TaskLogAspect,
        RunnerLogAspect
    ]
})
export class ServerTaskModule {

}
