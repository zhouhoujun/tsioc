
import { ITransformConfigure } from './core/ITransformConfigure';
import { InjectAssetToken, AssetConfigure } from '../core/handles/IAssetActivity';

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


/**
 *  stream asset token.
 */
export const StreamAssetToken = new InjectAssetToken('stream-asset');
