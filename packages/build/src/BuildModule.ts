import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';
import { ServerActivitiesModule } from '@ts-ioc/platform-server-activities';
import { AssetSetup } from './AssetSetup';
// import { ServerLogsModule } from '@ts-ioc/platform-server-logs';


@DIModule({
    imports: [
        AssetSetup,
        // ServerLogsModule,
        ServerActivitiesModule,
        buildcore
    ],
    exports: [
        // ServerLogsModule,
        ServerActivitiesModule,
        buildcore
    ]
})
export class BuildModule {
}
