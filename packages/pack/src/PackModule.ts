import { DIModule } from '@tsdi/boot';
import { ServerBootstrapModule } from '@tsdi/platform-server-boot';
import * as tasks from './tasks';
import * as transforms from './transforms';
import * as rollups from './rollups';
import * as builds from './builds';
import { TsComplie } from './ts-complie';
import { NodeActivityContext } from './NodeActivityContext';
import { PlatformService } from './PlatformService';
import * as pipes from './pipes';

@DIModule({
    regIn: 'root',
    imports: [
        ServerBootstrapModule,
    ],
    providers: [
        [pipes],
        TsComplie,
        NodeActivityContext,
        PlatformService
    ],
    declarations: [
        tasks,
        rollups,
        transforms,
        builds
    ]
})
export class PackModule {

}
