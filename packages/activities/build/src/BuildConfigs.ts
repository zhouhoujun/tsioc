import { GCoreActivityConfigs } from '@taskfr/core';
import { BuildConfigure, BuildHandleConfigure, TestConfigure, UglifyConfigure, WatchConfigure, CleanConfigure, AssetConfigure, DestConfigure, SourceConfigure } from './core';
import { TsConfigure, ITransformConfigure, AnnotationsConfigure, StreamDestConfigure, StreamSourceConfigure, StreamUglifyConfigure,  } from './transform';
import { ShellActivityConfig, ExecFileActivityConfig } from './shells';

/**
 *  build configure.
 */
export type BuildConfigures<T> = GCoreActivityConfigs<T> | AssetConfigure | ITransformConfigure | BuildHandleConfigure | BuildConfigure
| TsConfigure | DestConfigure | StreamDestConfigure | SourceConfigure | StreamSourceConfigure | TestConfigure | UglifyConfigure | StreamUglifyConfigure
| WatchConfigure | AnnotationsConfigure | CleanConfigure | ShellActivityConfig | ExecFileActivityConfig;
