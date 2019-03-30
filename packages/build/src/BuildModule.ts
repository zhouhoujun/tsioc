import { DIModule } from '@tsdi/boot';
import * as buildcore from './core';
import { ServerActivitiesModule } from '@tsdi/platform-server-activities';
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
