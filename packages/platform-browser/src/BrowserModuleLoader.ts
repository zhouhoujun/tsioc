import { IModuleLoader, DefaultModuleLoader } from '@ts-ioc/core';

declare let System: any;
declare let require: any;
export class BrowserModuleLoader extends DefaultModuleLoader implements IModuleLoader {

    constructor() {
        super()
    }

    protected createLoader() {
        if (typeof System !== 'undefined') {
            return (modulepath: string) => {
                return System.import(modulepath);
            }
        } else if (typeof require !== 'undefined') {
            return (modulepath: string) => {
                return new Promise((resolve, reject) => {
                    require([modulepath], (mud) => {
                        resolve(mud);
                    }, err => {
                        reject(err);
                    })
                });
            }
        } else {
            throw new Error('has not module loader');
        }
    }

}
