import { ITaskDecorator, createTaskDecorator, ActivityBuilderToken } from '@taskfr/core';
import { AssetConfigure } from '../core/handles/AssetConfigure';
import { AssetToken } from '../core/handles/IAssetActivity';
import { StreamAssetConfigure } from '../transform/StreamAssetConfigure';
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
export const Asset: ITaskDecorator<AssetMetadata> = createTaskDecorator<AssetMetadata>('Asset', ActivityBuilderToken, AssetToken, 'AssetActivity');
