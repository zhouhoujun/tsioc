import { Modules } from '@tsdi/ioc';
import { DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {ModuleLoader}
 */
export declare class NodeModuleLoader extends DefaultModuleLoader implements ModuleLoader {
    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]>;
    protected createLoader(): (modulepath: string) => Promise<Modules>;
}
