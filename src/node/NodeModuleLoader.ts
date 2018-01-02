import { IModuleLoader } from '../IModuleLoader';
import { Type } from '../Type';
import { toAbsolutePath } from './toAbsolute';
import { AsyncLoadOptions } from '../LoadOptions';



export class NodeModuleLoader implements IModuleLoader {

    constructor() {

    }

    private _glob: (patterns: string | string[]) => Promise<string[]>;
    getGlob() {
        if (!this._glob) {
            this._glob = require('globby');
        }
        return this._glob;
    }
    load(options: AsyncLoadOptions): Promise<(Type<any> | object)[]> {
        let glob = this.getGlob();
        if (options.files) {
            return glob(options.files).then(flies => {
                return flies.map(fp => {
                    return this.loadModule(toAbsolutePath(options.basePath, fp));
                });
            })
        } else {
            return Promise.resolve([]);
        }
    }

    loadModule(file: string): Type<any> | object {
        return require(file);
    }

}
