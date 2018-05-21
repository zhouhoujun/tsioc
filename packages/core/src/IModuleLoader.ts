import { Type, ModuleType, LoadType } from './types';
import { InjectToken } from './InjectToken';

/**
 * module loader token.
 */
export const ModuleLoaderToken = new InjectToken<IModuleLoader>('__IOC_ModuleLoader');


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
     * @param {...LoadType[]} modules
     * @returns {Promise<ModuleType[]>}
     * @memberof IModuleLoader
     */
    load(...modules: LoadType[]): Promise<ModuleType[]>;

    /**
     * load all class types in modules, load by files patterns, module name or modules.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type<any>[]>}
     * @memberof IModuleLoader
     */
    loadTypes(...modules: LoadType[]): Promise<Type<any>[]>;

    /**
     * get all class type in modules.
     *
     * @param {...ModuleType[]} modules
     * @returns {Type<any>[]}
     * @memberof IModuleLoader
     */
    getTypes(...modules: ModuleType[]): Type<any>[];

}
