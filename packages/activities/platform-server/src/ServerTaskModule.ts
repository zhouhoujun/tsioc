import { DIModule } from '@ts-ioc/bootstrap';
import { ServerModule } from '@ts-ioc/platform-server';
import { ServerBootstrapModule } from '@ts-ioc/platform-server/bootstrap';
import { TaskLogAspect, RunnerLogAspect } from './aop';

@DIModule({
    imports: [
        ServerModule,
        ServerBootstrapModule,
        TaskLogAspect,
        RunnerLogAspect
    ],
    exports: [
        ServerBootstrapModule,
        TaskLogAspect,
        RunnerLogAspect
    ]
})
export class ServerTaskModule {

}
