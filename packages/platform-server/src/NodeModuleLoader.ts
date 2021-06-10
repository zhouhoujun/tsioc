import { Modules, isString, IModuleLoader } from '@tsdi/ioc';
import { ModuleLoader } from '@tsdi/core';
import { runMainPath, toAbsolutePath } from './toAbsolute';
import * as globby from 'globby';


/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {IModuleLoader}
 */
export class NodeModuleLoader extends ModuleLoader implements IModuleLoader {

    protected normalize(pth: string) {
        return pth ? pth.split('\\').join('/') : pth;
    }
    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]> {
        if (isString(files)) {
            files = this.normalize(files);
        } else {
            files = files.map(f => this.normalize(f));
        }
        basePath = basePath || runMainPath();

        return globby(files, { cwd: basePath }).then(mflies => {
            return Promise.all(mflies.map(fp => {
                return import(toAbsolutePath(basePath, fp));
            }));
        });
    }

    protected createLoader(): (modulepath: string) => Promise<Modules[]> {
        return (modulepath: string) => Promise.resolve(require(modulepath));
    }

}
