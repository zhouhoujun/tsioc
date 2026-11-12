import { Modules, isString } from '@tsdi/ioc';
import { DefaultModuleLoader, ModuleLoader } from '@tsdi/core';
import { runMainPath, toAbsolutePath } from './toAbsolute';
import * as globbyModule from 'globby';

const globby = ((globbyModule as any).default ?? globbyModule) as typeof import('globby');


/**
 * server nodule loader.
 *
 * @export
 * @class NodeModuleLoader
 * @implements {ModuleLoader}
 */
export class NodeModuleLoader extends DefaultModuleLoader implements ModuleLoader {

    protected override loadFile(files: string | string[], basePath?: string): Promise<Modules[]> {
        if (isString(files)) {
            files = this.normalize(files)
        } else {
            files = files.map(f => this.normalize(f))
        }
        basePath = basePath || runMainPath();

        return globby(files, { cwd: basePath }).then((mflies: string[]) => {
            return Promise.all(mflies.map((fp: string) => {
                return import(toAbsolutePath(basePath!, isString(fp) ? fp : (fp as { path: string }).path))
            }))
        })
    }

    protected override createLoader(): (modulepath: string) => Promise<Modules> {
        return (modulepath: string) => import(modulepath)
    }

}
