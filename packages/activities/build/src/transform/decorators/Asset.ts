import { ITaskDecorator, createTaskDecorator } from '@taskfr/core';
import { AssetConfigure } from '../core/AssetConfigure';
import { AssetToken, AssetBuilderToken } from '../core/IAssetActivity';
/**
 * asset task metadata.
 *
 * @export
 * @interface AssetTaskMetadata
 * @extends {AssetConfigure}
 */
export interface AssetMetadata extends AssetConfigure {

}

/**
 * Asset task decorator, use to define class is a asset task element.
 *
 * @AssetTask
 */
export const Asset: ITaskDecorator<AssetMetadata> = createTaskDecorator<AssetMetadata>('Asset', AssetBuilderToken, AssetToken);
