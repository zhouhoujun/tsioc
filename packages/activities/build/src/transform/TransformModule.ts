import { DIModule } from '@ts-ioc/bootstrap';
import * as core from './core';
import * as assets from './assets';
import { AssetSetup } from './AssetSetup';

@DIModule({
    imports: [
        AssetSetup,
        core,
        assets
    ],
    exports: [
        core,
        assets
    ]
})
export class TransformModule {

}
