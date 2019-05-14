import { DIModule, RegScope } from '@tsdi/boot';
import * as cores from './core';
import * as tasks from './tasks';
import * as transforms from './transforms';
import * as rollups from './rollups';
import * as builds from './builds';

@DIModule({
    regScope: RegScope.boot,
    imports: [
        cores,
        tasks,
        rollups,
        transforms,
        builds
    ],
    exports: [
        cores,
        tasks,
        rollups,
        transforms,
        builds
    ]
})
export class PackModule {

}
