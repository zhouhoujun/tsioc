import { DIModule } from '@tsdi/boot';
import * as cores from './core';
import * as tasks from './tasks';


@DIModule({
    imports: [
        cores,
        tasks
    ],
    exports: [
        cores,
        tasks
    ]
})
export class PackModule {

}
