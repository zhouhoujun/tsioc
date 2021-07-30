import {
    ModuleLoader, ChildModule, LoadType, PathModules, Modules, Type, lang,
    isString, isArray, isMetadataObject, isFunction, Injector
} from '@tsdi/ioc';





declare let require: any;

const fileChkExp = /\/((\w|%|\.))+\.\w+$/;

export function isPathModules(target: any): target is PathModules {
    return isMetadataObject(target, 'modules', 'files');
}

export function isChildModule(target: any): target is ChildModule {
    return target && isFunction(target.loadChild);
}

/**
 * default module loader.
 *
 * @export
 * @class DefaultModuleLoader
 * @implements {ModuleLoader}
 */
export class ModuleLoaderImpl implements ModuleLoader {

    static ρNPT = true;

    private _loader: (modulepath: string) => Promise<Modules[]>;
    getLoader() {
        if (!this._loader) {
            this._loader = this.createLoader();
        }
        return this._loader;
    }

    async register(injecor: Injector, modules: LoadType[]): Promise<Type[]> {
        const mdls = await this.load(modules);
        return injecor.use(mdls);
    }

    /**
     * load module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     */
    load(modules: LoadType[]): Promise<Modules[]> {
        if (modules.length) {
            return Promise.all(modules.map(mdty => this.getMoudle(mdty)))
                .then(mds => mds.reduce((prv, m) => prv.concat(m), []));
        } else {
            return Promise.resolve([]);
        }
    }

    getMoudle(mdty: LoadType): Promise<Modules[]> {
        if (isString(mdty)) {
            return this.isFile(mdty) ? this.loadFile(mdty) : this.loadModule(mdty);
        } else if (isPathModules(mdty)) {
            return this.loadPathModule(mdty);
        } else if (isChildModule(mdty)) {
            return mdty.loadChild() as Promise<any>;
        } else {
            return Promise.resolve(mdty ? [mdty] : []);
        }
    }

    /**
     * load all class types in modules
     *
     * @param {LoadType[]} mdl
     * @returns {Promise<Type[]>}
     */
    async loadType(mdl: LoadType): Promise<Type[]> {
        const mdls = await this.getMoudle(mdl);
        return lang.getTypes(mdls);
    }

    /**
     * load types from module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    async loadTypes(modules: LoadType[]): Promise<Type[][]> {
        let mdls = await this.load(modules);
        return mdls.map(md => lang.getTypes(md));
    }

    async require(fileName: string): Promise<any> {
        return lang.first(await this.loadFile(fileName));
    }

    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]> {
        let loader = this.getLoader();
        let fRes: Promise<Modules[]>;
        if (isArray(files)) {
            fRes = Promise.all(files.map(f => loader(f)))
                .then(mds => mds.reduce((prv, m) => prv.concat(m), []));
        } else {
            fRes = loader(files);
        }
        return fRes.then(ms => ms.filter(it => !!it));
    }

    protected isFile(str: string) {
        return str && fileChkExp.test(str.split('\\').join('/'));
    }


    protected loadModule(moduleName: string): Promise<Modules[]> {
        let loader = this.getLoader();
        return loader(moduleName).then(ms => ms.filter(it => !!it));
    }

    protected async loadPathModule(pmd: PathModules): Promise<Modules[]> {
        let modules = pmd.files ? await this.loadFile(pmd.files, pmd.basePath) : [];
        if (pmd.modules) {
            await Promise.all(pmd.modules.map(async nmd => {
                if (isString(nmd)) {
                    modules.push(...await this.loadModule(nmd));
                } else {
                    modules.push(nmd);
                }
            }));
        }

        return modules;
    }

    protected createLoader(): (modulepath: string) => Promise<Modules[]> {
        if (typeof require !== 'undefined') {
            return (modulepath: string) => {
                return new Promise<Modules[]>((resolve, reject) => {
                    require(modulepath, (mud) => {
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
