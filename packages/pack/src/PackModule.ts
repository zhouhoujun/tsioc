import { DIModule } from '@tsdi/boot';
import * as cores from './core';
import * as tasks from './tasks';
import * as transforms from './transforms';
import * as rollups from './rollups';

@DIModule({
    imports: [
        cores,
        tasks,
        rollups,
        transforms
    ],
    exports: [
        cores,
        tasks,
        rollups,
        transforms
    ]
})
export class PackModule {

}
