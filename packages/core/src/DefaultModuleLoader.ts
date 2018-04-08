import { Type } from './types';
import { IModuleLoader, AsyncLoadOptions } from '.';

declare let require: any;
export class DefaultModuleLoader implements IModuleLoader {

    constructor() {

    }

    private _loader: (modulepath: string) => Promise<string[]>;
    getLoader() {
        if (!this._loader) {
           this._loader = this.createLoader();
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

    protected createLoader(): (modulepath: string) => Promise<string[]>{
        if (typeof require !== 'undefined') {
            return (modulepath: string) => {
                return new Promise<string[]>((resolve, reject) => {
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
