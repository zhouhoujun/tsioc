import { Type, ModuleType, LoadType, PathModules, Express } from './types';
import { IModuleLoader } from './IModuleLoader';
import { isString, isClass, isObject, isArray } from './utils';
import { hasOwnClassMetadata, IocExt } from './core';

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

    private _loader: (modulepath: string) => Promise<ModuleType[]>;
    getLoader() {
        if (!this._loader) {
            this._loader = this.createLoader();
        }
        return this._loader;
    }

    /**
     * load module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<ModuleType[]>}
     * @memberof DefaultModuleLoader
     */
    load(modules: LoadType[]): Promise<ModuleType[]> {
        if (modules.length) {
            return Promise.all(modules.map(mdty => {
                if (isString(mdty)) {
                    return this.isFile(mdty) ? this.loadFile(mdty) : this.loadModule(mdty);
                } else if (isObject(mdty) && (mdty['modules'] || mdty['files'])) {
                    return this.loadPathModule(mdty as PathModules);
                } else {
                    return mdty ? [mdty] : [];
                }
            }))
                .then(allms => {
                    let rmodules: ModuleType[] = [];
                    allms.forEach(ms => {
                        rmodules = rmodules.concat(ms);
                    })
                    return rmodules;
                });
        } else {
            return Promise.resolve([]);
        }
    }

    /**
     * load types from module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof IContainerBuilder
     */
    async loadTypes(modules: LoadType[], filter?: Express<Type<any>, boolean>): Promise<Type<any>[]> {
        let mdls = await this.load(modules);
        return this.getTypes(mdls, filter);
    }

    /**
     * get all class type in modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {Type<any>[]}
     * @memberof DefaultModuleLoader
     */
    getTypes(modules: ModuleType[], filter?: Express<Type<any>, boolean>): Type<any>[] {
        let regModules: Type<any>[] = [];
        modules.forEach(m => {
            let types = this.getContentTypes(m);
            let hasFilterMdl = false;
            if (filter) {
                let filters = types.filter(filter);
                hasFilterMdl = filters && filters.length > 0;
                if (hasFilterMdl) {
                    regModules.push(...filters);
                }
            }
            if (!hasFilterMdl) {
                regModules.push(...types);
            }
        });

        return regModules;
    }

    protected loadFile(files: string | string[], basePath?: string): Promise<ModuleType[]> {
        let loader = this.getLoader();
        let fRes: Promise<ModuleType[]>;
        if (isArray(files)) {
            fRes = Promise.all(files.map(f => loader(f)))
                .then(allms => {
                    let rms = [];
                    allms.forEach(ms => {
                        rms = rms.concat(ms);
                    });
                    return rms;
                });
        } else {
            fRes = loader(files);
        }
        return fRes.then(ms => ms.filter(it => !!it));
    }

    protected isFile(str: string) {
        return str && /\/((\w|%|\.))+\.\w+$/.test(str.replace(/\\\\/gi, '/'));
    }


    protected loadModule(moduleName: string): Promise<ModuleType[]> {
        let loader = this.getLoader();
        return loader(moduleName).then(ms => ms.filter(it => !!it));
    }

    protected async loadPathModule(pmd: PathModules): Promise<ModuleType[]> {
        let loader = this.getLoader();
        let modules: ModuleType[] = [];
        if (pmd.files) {
            await this.loadFile(pmd.files, pmd.basePath)
                .then(allmoduls => {
                    allmoduls.forEach(ms => {
                        modules = modules.concat(ms);
                    });
                    return modules;
                })
        }
        if (pmd.modules) {
            await Promise.all(pmd.modules.map(nmd => {
                return isString(nmd) ? this.loadModule(nmd) : nmd;
            })).then(ms => {
                modules = modules.concat(ms);
                return modules;
            });
        }

        return modules;
    }

    protected createLoader(): (modulepath: string) => Promise<ModuleType[]> {
        if (typeof require !== 'undefined') {
            return (modulepath: string) => {
                return new Promise<ModuleType[]>((resolve, reject) => {
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

    protected getContentTypes(regModule: ModuleType): Type<any>[] {
        let regModules: Type<any>[] = [];

        if (isClass(regModule)) {
            regModules.push(regModule);
        } else {
            let rmodules = regModule['exports'] ? regModule['exports'] : regModule;
            for (let p in rmodules) {
                if (isClass(rmodules[p])) {
                    regModules.push(rmodules[p]);
                }
            }
        }

        return regModules;
    }

}
