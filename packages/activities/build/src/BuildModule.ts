import { DIModule } from '@ts-ioc/bootstrap';
import * as buildcore from './core';
import { ServerTaskModule } from '@taskfr/platform-server';
@DIModule({
    imports: [
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
