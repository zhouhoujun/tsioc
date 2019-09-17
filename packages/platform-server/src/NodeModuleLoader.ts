import { IModuleLoader, ModuleLoader } from '@tsdi/core';
import { runMainPath, toAbsolutePath } from './toAbsolute';
import { Modules, isString } from '@tsdi/ioc';
import * as globby from 'globby';


/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {IModuleLoader}
 */
export class NodeModuleLoader extends ModuleLoader implements IModuleLoader {

    constructor() {
        super();
    }

    protected normalize(pth: string) {
        return pth ? pth.replace(/\\/g, '/') : pth;
    }
    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]> {
        if (isString(files)) {
            files = this.normalize(files);
        } else {
            files = files.map(f => this.normalize(f));
        }
        basePath = basePath || runMainPath();
        return globby(files, { cwd: basePath }).then(mflies => {
            return mflies.map(fp => {
                return require(toAbsolutePath(basePath, fp));
            });
        });
    }

    protected createLoader(): (modulepath: string) => Promise<Modules[]> {
        return (modulepath: string) => Promise.resolve(require(modulepath));
    }

}
