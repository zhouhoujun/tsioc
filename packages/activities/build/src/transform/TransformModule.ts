import { DIModule } from '@ts-ioc/bootstrap';
import * as core from './core';
import * as assets from './assets';
import { StreamAssetActivity } from './AssetActivity';

@DIModule({
    imports: [
        core,
        StreamAssetActivity,
        assets
    ],
    exports: [
        core,
        StreamAssetActivity,
        assets
    ]
})
export class TransformModule {

}
