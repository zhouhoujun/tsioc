import { DIModule } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import * as tasks from './tasks';
import * as transforms from './transforms';
import * as rollups from './rollups';
import * as builds from './builds';
import { TsComplie } from './ts-complie';
import { NodeActivityContext } from './NodeActivityContext';
import { PlatformService } from './PlatformService';

@DIModule({
    regIn: 'root',
    imports: [
        ServerBootstrapModule,
    ],
    providers: [
        TsComplie,
        NodeActivityContext,
        PlatformService
    ],
    components: [
        tasks,
        rollups,
        transforms,
        builds
    ],
    exports: [
        ServerBootstrapModule
    ]
})
export class PackModule {

}
