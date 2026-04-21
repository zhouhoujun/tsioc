import { Injector, Modules, noPointcut, Type } from '@tsdi/ioc';
import { LoadType, ModuleLoader, PathModules } from '../ModuleLoader';
/**
 * default module loader for {@link ModuleLoader}.
 *
 * @export
 * @class DefaultModuleLoader
 * @extends {ModuleLoader}
 */
export declare class DefaultModuleLoader extends ModuleLoader {
    static [noPointcut]: boolean;
    private _loader;
    getLoader(): (modulepath: string) => Promise<Modules>;
    register(injecor: Injector, modules: LoadType[]): Promise<Type[]>;
    /**
     * load module.
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Modules[]>}
     */
    load(modules: LoadType[]): Promise<Modules[]>;
    getMoudle(mdty: LoadType): Promise<Modules[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} mdl
     * @returns {Promise<Type[]>}
     */
    loadType(mdl: LoadType): Promise<Type[]>;
    /**
     * load types from module.
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    loadTypes(modules: LoadType[]): Promise<Type[][]>;
    require(moduleName: string): Promise<any>;
    protected loadFile(files: string | string[], basePath?: string): Promise<Modules[]>;
    protected resolveFilename(filename: string, basePath?: string): string;
    protected isFile(str: string): boolean | "";
    protected loadPathModule(pmd: PathModules): Promise<Modules[]>;
    protected createLoader(): (modulepath: string) => Promise<Modules>;
    protected normalize(pth: string): string;
}
export declare function isPathModules(target: any): target is PathModules;
