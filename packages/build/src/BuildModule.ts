import { DIModule } from '@ts-ioc/boot';
import * as buildcore from './core';
import { ServerActivitiesModule } from '@ts-ioc/platform-server-activities';
import { AssetSetup } from './AssetSetup';
import { TransformModule } from './transform';
import { ShellModule } from './shells';


@DIModule({
    imports: [
        AssetSetup,
        ServerActivitiesModule,
        buildcore,
        TransformModule,
        ShellModule
    ],
    exports: [
        ServerActivitiesModule,
        buildcore,
        TransformModule,
        ShellModule
    ]
})
export class BuildModule {
}
