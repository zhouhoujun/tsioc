import { GCoreActivityConfigs } from '@taskfr/core';
import { BuildConfigure, BuildHandleConfigure, TestConfigure, UglifyConfigure, WatchConfigure, CleanConfigure } from './core';
import { TsConfigure, AssetConfigure, ITransformConfigure, DestConfigure, SourceConfigure, AnnotationsConfigure,  } from './transform';
import { ShellActivityConfig, ExecFileActivityConfig } from '@taskfr/node';

/**
 *  build configure.
 */
export type BuildConfigures<T> = GCoreActivityConfigs<T> | AssetConfigure | ITransformConfigure | BuildHandleConfigure | BuildConfigure
| TsConfigure | DestConfigure | SourceConfigure | TestConfigure | UglifyConfigure
| WatchConfigure | AnnotationsConfigure | CleanConfigure | ShellActivityConfig | ExecFileActivityConfig;
