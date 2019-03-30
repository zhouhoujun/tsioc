import { lang } from '@tsdi/ioc';
import { ModuleLoader, IModuleLoader } from '@tsdi/core';

declare let System: any;
declare let require: any;
export class BrowserModuleLoader extends ModuleLoader implements IModuleLoader {

    constructor() {
        super()
    }

    protected createLoader() {
        if (typeof System !== 'undefined') {
            return (modulepath: string) => {
                return System.import(modulepath);
            }
        } else {
            lang.assert(require, 'has not module loader');
            return (modulepath: string) => {
                return new Promise((resolve, reject) => {
                    require([modulepath], (mud) => {
                        resolve(mud);
                    }, err => {
                        reject(err);
                    })
                });
            }
        }
    }

}
