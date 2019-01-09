
import { ITransformConfigure } from './core/ITransformConfigure';
import { AssetConfigure } from '../core/handles/IAssetBuildHandle';

/**
 * stream asset configure
 *
 * @export
 * @interface StreamAssetConfigure
 * @extends {AssetActivity}
 * @extends {ITransformConfigure}
 */
export interface StreamAssetConfigure extends AssetConfigure, ITransformConfigure {

}

