import { DIModule } from '@ts-ioc/bootstrap';
import { BrowserModule } from '@ts-ioc/platform-browser';
import { TaskLogAspect, RunnerLogAspect } from './aop';

@DIModule({
    imports: [
        BrowserModule,
        TaskLogAspect,
        RunnerLogAspect
    ],
    exports: [
        BrowserModule,
        TaskLogAspect,
        RunnerLogAspect
    ]
})
export class BrowserTaskModule {

}
