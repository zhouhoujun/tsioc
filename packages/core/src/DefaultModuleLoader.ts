import { Type, ModuleType } from './types';
import { IModuleLoader, AsyncLoadOptions } from '.';

declare let require: any;

/**
 * default module loader.
 * 
 * @export
 * @class DefaultModuleLoader
 * @implements {IModuleLoader}
 */
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

    load(options: AsyncLoadOptions): Promise<ModuleType[]> {
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

    loadModule(file: string): ModuleType | Promise<ModuleType> {
        let loader = this.getLoader();
        return loader(file);
    }

    protected createLoader(): (modulepath: string) => Promise<string[]> {
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
