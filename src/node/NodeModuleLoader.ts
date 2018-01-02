import { IModuleLoader } from '../IModuleLoader';
import { Type } from '../Type';
import { toAbsoluteSrc } from './toAbsolute';
import { AsyncLoadOptions } from '../LoadOptions';
const globby = require('globby');


export class NodeModuleLoader implements IModuleLoader {

    constructor() {

    }


    load(options: AsyncLoadOptions): Promise<(Type<any> | object)[]> {
        if (options.files) {
            return globby(toAbsoluteSrc(options.basePath, options.files)).then(flies => {
                return flies.map(fp => {
                    return this.loadModule(fp);
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
