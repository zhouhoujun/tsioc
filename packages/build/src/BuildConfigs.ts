import { GCoreActivityConfigs, isAcitvityClass } from '@ts-ioc/activities';
import {
    BuildConfigure, BuildHandleConfigure, TestConfigure, UglifyConfigure,
    WatchConfigure, CleanConfigure, AssetConfigure, DestConfigure, SourceConfigure, IAssetBuildHandle
} from './core';
import {
    TsConfigure, ITransformConfigure, AnnotationsConfigure, StreamDestConfigure,
    StreamSourceConfigure, StreamUglifyConfigure,
} from './transform';
import { ShellActivityConfig, ExecFileActivityConfig } from './shells';
import { Type } from '@ts-ioc/core';

/**
 *  build configure.
 */
export type BuildConfigures<T> = GCoreActivityConfigs<T> | AssetConfigure | ITransformConfigure | BuildHandleConfigure | BuildConfigure
    | TsConfigure | DestConfigure | StreamDestConfigure | SourceConfigure | StreamSourceConfigure | TestConfigure | UglifyConfigure | StreamUglifyConfigure
    | WatchConfigure | AnnotationsConfigure | CleanConfigure | ShellActivityConfig | ExecFileActivityConfig;


/**
 * is asset class or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isAssetClass(target: any): target is Type<IAssetBuildHandle> {
    return isAcitvityClass(target, meta => meta.decorType === 'Asset');
}
