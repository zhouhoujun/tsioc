import { IModuleLoader, Modules, DefaultModuleLoader } from '@ts-ioc/core';
import { toAbsoluteSrc } from './toAbsolute';

declare let require: any;



/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {IModuleLoader}
 */
export class NodeModuleLoader extends DefaultModuleLoader implements IModuleLoader {

    constructor() {
        super();
    }

    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]> {
        let globby = require('globby');
        return globby(toAbsoluteSrc(basePath, files)).then((mflies: string[]) => {
            return mflies.map(fp => {
                return require(fp);
            });
        });
    }

    protected createLoader(): (modulepath: string) => Promise<Modules[]> {
        return (modulepath: string) => Promise.resolve(require(modulepath));
    }

}
