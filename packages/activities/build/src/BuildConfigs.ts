import { GCoreActivityConfigs } from '@taskfr/core';
import { BuildConfigure, AssetConfigure, ITransformConfigure, DestConfigure, SourceConfigure, AnnotationsConfigure, BuildHandleConfigure, TestConfigure, UglifyConfigure, WatchConfigure, CleanConfigure } from './core';
import { TsConfigure } from './assets';
import { ShellActivityConfig, ExecFileActivityConfig } from '@taskfr/node';

/**
 *  build configure.
 */
export type BuildConfigures<T> = GCoreActivityConfigs<T> | AssetConfigure | ITransformConfigure | BuildHandleConfigure | BuildConfigure
| TsConfigure | DestConfigure | SourceConfigure | TestConfigure | UglifyConfigure
| WatchConfigure | AnnotationsConfigure | CleanConfigure | ShellActivityConfig | ExecFileActivityConfig;
