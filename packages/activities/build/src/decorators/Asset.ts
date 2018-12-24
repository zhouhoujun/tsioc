import { ITaskDecorator, createTaskDecorator, ActivityBuilderToken } from '@taskfr/core';
import { AssetToken, AssetConfigure } from '../core/handles/IAssetBuildHandle';
import { StreamAssetConfigure } from '../transform/StreamAssetConfigure';
import { isNullOrUndefined } from '@ts-ioc/core';
import { ShellAssetConfigure, ShellAssetToken } from '../shells/IShellAssetActivity';


/**
 * asset task metadata.
 *
 * @export
 * @interface AssetTaskMetadata
 * @extends {AssetConfigure}
 */
export interface AssetMetadata extends AssetConfigure, StreamAssetConfigure, ShellAssetConfigure {

}

/**
 * Asset task decorator, use to define class is a asset task element.
 *
 * @AssetTask
 */
export const Asset: ITaskDecorator<AssetMetadata> = createTaskDecorator<AssetMetadata>('Asset', ActivityBuilderToken, AssetToken, 'AssetBuildHanlde');
