import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';
import { ServerTaskModule } from '@ts-ioc/platform-server-activities';
import { AssetSetup } from './AssetSetup';
@DIModule({
    imports: [
        AssetSetup,
        ServerTaskModule,
        buildcore
    ],
    exports: [
        ServerTaskModule,
        buildcore
    ]
})
export class BuildModule {
}
