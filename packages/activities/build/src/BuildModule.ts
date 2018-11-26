import { DIModule } from '@ts-ioc/bootstrap';
import * as core from './core';
import { BuildSetup } from './BuildSetup';
import { NodejsModule } from '@taskfr/node';
import * as assets from './assets';

@DIModule({
    imports: [
        NodejsModule,
        BuildSetup,
        core,
        assets
    ],
    exports: [
        NodejsModule,
        core,
        assets
    ]
})
export class BuildModule {
}
