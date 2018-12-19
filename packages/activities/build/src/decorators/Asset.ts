import { ITaskDecorator, createTaskDecorator, ActivityBuilderToken } from '@taskfr/core';
import { AssetToken, AssetConfigure } from '../core/handles/IAssetActivity';
import { StreamAssetConfigure, StreamAssetToken } from '../transform/StreamAssetConfigure';
import { isArray } from '@ts-ioc/core';


/**
 * asset task metadata.
 *
 * @export
 * @interface AssetTaskMetadata
 * @extends {AssetConfigure}
 */
export interface AssetMetadata extends AssetConfigure, StreamAssetConfigure {

}

/**
 * Asset task decorator, use to define class is a asset task element.
 *
 * @AssetTask
 */
export const Asset: ITaskDecorator<AssetMetadata> = createTaskDecorator<AssetMetadata>('Asset', ActivityBuilderToken, (meta) => isArray(meta.pipes) ? StreamAssetToken : AssetToken, 'AssetActivity');
