import { LoadType, Modules, Type } from './types';
import { Abstract } from './metadata/fac';
import { Injector } from './injector';


/**
 * module loader for ioc.
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
     * dynamic require file.
     *
     * @param {string} fileName
     * @returns {Promise<any>}
     */
    abstract require(fileName: string): Promise<any>;
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
