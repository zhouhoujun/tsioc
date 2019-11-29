import { DIModule, RegFor } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import * as cores from './core';
import * as tasks from './tasks';
import * as transforms from './transforms';
import * as rollups from './rollups';
import * as builds from './builds';
import { TsComplie } from './ts-complie';

@DIModule({
    regFor: RegFor.boot,
    imports: [
        TsComplie,
        ServerBootstrapModule,
        cores,
        tasks,
        rollups,
        transforms,
        builds
    ],
    exports: [
        TsComplie,
        ServerBootstrapModule,
        cores,
        tasks,
        rollups,
        transforms,
        builds
    ]
})
export class PackModule {

}
