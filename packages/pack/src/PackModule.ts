import { DIModule } from '@tsdi/boot';
import * as cores from './core';
import * as tasks from './tasks';
import * as builds from './builds';

@DIModule({
    imports: [
        cores,
        tasks,
        builds
    ],
    exports: [
        cores,
        tasks,
        builds
    ]
})
export class PackModule {

}
