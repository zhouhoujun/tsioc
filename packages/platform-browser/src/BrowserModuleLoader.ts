import { Type, IModuleLoader, AsyncLoadOptions } from '@tsioc/core';

declare let System: any;
declare let require: any;
export class BrowserModuleLoader implements IModuleLoader {

    constructor() {

    }

    private _loader: (modulepath: string) => Promise<string[]>;
    getLoader() {
        if (!this._loader) {
            if (typeof System !== 'undefined') {
                this._loader = (modulepath: string) => {
                    return System.import(modulepath);
                }
            } else if (typeof require !== 'undefined') {
                this._loader = (modulepath: string) => {
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
        return this._loader;
    }
    load(options: AsyncLoadOptions): Promise<(Type<any> | object)[]> {
        if (options.files) {
            return Promise.all(options.files).then(flies => {
                return flies.map(fp => {
                    return this.loadModule(fp);
                });
            })
        } else {
            return Promise.resolve([]);
        }
    }

    loadModule(file: string): Type<any> | object | Promise<Type<any> | object> {
        let loader = this.getLoader();
        return loader(file);
    }

}
