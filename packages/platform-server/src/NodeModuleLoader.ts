import { Type, IModuleLoader, AsyncLoadOptions } from '@ts-ioc/core';
import { toAbsoluteSrc } from './toAbsolute';

declare let require: any;




export class NodeModuleLoader implements IModuleLoader {

    constructor() {

    }


    load(options: AsyncLoadOptions): Promise<(Type<any> | object)[]> {
        if (options.files) {
            let globby = require('globby');
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
