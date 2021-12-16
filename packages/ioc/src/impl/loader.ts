import { ChildModule, LoadType, Modules, PathModules, Type } from '../types';
import { isArray, isFunction, isMetadataObject, isString } from '../utils/chk';
import { getTypes } from '../utils/lang';
import { ModuleLoader } from '../module.loader';
import { Injector } from '../injector';

/**
 * default module loader for {@link ModuleLoader}.
 *
 * @export
 * @class DefaultModuleLoader
 * @extends {ModuleLoader}
 */
export class DefaultModuleLoader extends ModuleLoader {

    static ρNPT = true;

    private _loader!: (modulepath: string) => Promise<Modules>;
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
            return this.isFile(mdty) ? this.loadFile(mdty) : this.require(mdty).then(m => m ? [m] : []);
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
        return getTypes(mdls);
    }

    /**
     * load types from module.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    async loadTypes(modules: LoadType[]): Promise<Type[][]> {
        let mdls = await this.load(modules);
        return mdls.map(md => getTypes(md));
    }

    require(moduleName: string): Promise<any> {
        let loader = this.getLoader();
        return loader(moduleName);
    }

    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]> {
        let loader = this.getLoader();
        let fRes: Promise<Modules[]>;
        basePath = basePath ? this.normalize(basePath) : '';
        if (isArray(files)) {
            fRes = Promise.all(files.map(f => loader(this.resolveFilename(this.normalize(f), basePath))))
                .then(mds => mds.reduce((prv, m) => prv.concat(m), [] as Modules[]).filter(it => !!it));
        } else {
            fRes = loader(this.resolveFilename(this.normalize(files), basePath)).then(m => m ? [m] : []);
        }
        return fRes;
    }

    protected resolveFilename(filename: string, basePath?: string) {
        if (basePath) {
            if (filename.startsWith(basePath)) {
                return filename;
            }
            return /\/$/.test(basePath) ? basePath + filename : basePath + '/' + filename;
        }
        return filename;
    }

    protected isFile(str: string) {
        return str && fileChkExp.test(str.split('\\').join('/'));
    }

    protected async loadPathModule(pmd: PathModules): Promise<Modules[]> {
        let modules = pmd.files ? await this.loadFile(pmd.files, pmd.basePath) : [];
        if (pmd.modules) {
            await Promise.all(pmd.modules.map(async nmd => {
                if (isString(nmd)) {
                    modules.push(await this.require(nmd));
                } else {
                    modules.push(nmd);
                }
            }));
        }

        return modules;
    }

    protected createLoader(): (modulepath: string) => Promise<Modules> {
        return (pth: string) => import(pth);
    }

    protected normalize(pth: string) {
        return pth ? pth.split('\\').join('/') : pth;
    }

}


const fileChkExp = /\/((\w|%|\.))+\.\w+$/;

export function isPathModules(target: any): target is PathModules {
    return isMetadataObject(target, 'modules', 'files');
}

export function isChildModule(target: any): target is ChildModule {
    return target && isFunction(target.loadChild);
}
