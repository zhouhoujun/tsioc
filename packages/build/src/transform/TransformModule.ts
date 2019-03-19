import { DIModule } from '@ts-ioc/boot';
import * as core from './core';
import * as assets from './assets';
import { AssetActivity } from './AssetActivity';

@DIModule({
    imports: [
        core,
        AssetActivity,
        assets
    ],
    exports: [
        core,
        AssetActivity,
        assets
    ]
})
export class TransformModule {

}
