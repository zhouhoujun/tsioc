import { InjectAssetToken, AssetConfigure } from '../core';

/**
 * shell asset token.
 */
export const ShellAssetToken = new InjectAssetToken('shell-asset');


/**
 * shell asset configure.
 *
 * @export
 * @interface ShellAssetConfigure
 * @extends {AssetConfigure}
 */
export interface ShellAssetConfigure extends AssetConfigure {

}
