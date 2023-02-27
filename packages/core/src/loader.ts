import { Injector, Modules, Type, Abstract } from '@tsdi/ioc';


/**
 * load modules in base on an path.
 *
 * @export
 * @interface PathModules
 */
export interface PathModules {
    /**
     * fire express base on the root path.
     *
     * @type {string}
     */
    basePath?: string;
    /**
     * in nodejs:
     * script files match express.
     * see: https://github.com/isaacs/node-glob
     *
     * in browser:
     * script file url.
     * @type {(string | string[])}
     */
    files?: string | string[];
    /**
     * modules
     *
     * @type {((Modules | string)[])}
     */
    modules?: (Modules | string)[];
}

export type LoadType =  Modules | string | PathModules;


/**
 * module loader for {@link Injector}.
 *
 * @export
 */
@Abstract()
export abstract class ModuleLoader {
    /**
     * load modules by files patterns, module name or modules.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     */
    abstract load(modules: LoadType[]): Promise<Modules[]>;
    /**
     * register types.
     * @param modules modules.
     */
    abstract register(injecor: Injector, modules: LoadType[]): Promise<Type[]>;
    /**
     * dynamic require module.
     *
     * @param {string} moduleName
     * @returns {Promise<any>}
     */
    abstract require(moduleName: string): Promise<any>;
    /**
     * get modules.
     * @param mdty
     */
    abstract getMoudle(mdty: LoadType): Promise<Modules[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} mdl
     * @returns {Promise<Type[]>}
     */
    abstract loadType(mdl: LoadType): Promise<Type[]>;
    /**
     * load all class types in modules
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    abstract loadTypes(modules: LoadType[]): Promise<Type[][]>;
}
