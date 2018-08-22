import { Type, Modules, LoadType } from '../types';
import { InjectToken } from '../InjectToken';

/**
 * module loader token.
 */
export const ModuleLoaderToken = new InjectToken<IModuleLoader>('DI_ModuleLoader');


/**
 * module loader interface for ioc.
 *
 * @export
 * @interface IModuleLoader
 */
export interface IModuleLoader {
    /**
     * load modules by files patterns, module name or modules.
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Modules[]>}
     * @memberof IModuleLoader
     */
    load(modules: LoadType[]): Promise<Modules[]>;

    /**
     * load all class types in modules
     *
     * @param {LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof IModuleLoader
     */
    loadTypes(modules: LoadType[]): Promise<Type<any>[][]>;

    /**
     * get all class type in modules.
     *
     * @param {Modules[]} modules
     * @returns {Type<any>[]}
     * @memberof IModuleLoader
     */
    getTypes(modules: Modules[]): Type<any>[][];

}

