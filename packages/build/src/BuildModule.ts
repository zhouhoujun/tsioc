import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';
import { ServerActivitiesModule } from '@ts-ioc/platform-server-activities';
import { AssetSetup } from './AssetSetup';
@DIModule({
    imports: [
        AssetSetup,
        ServerActivitiesModule,
        buildcore
    ],
    exports: [
        ServerActivitiesModule,
        buildcore
    ]
})
export class BuildModule {
}
