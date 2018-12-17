import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';
import { ServerTaskModule } from '@taskfr/platform-server';
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
