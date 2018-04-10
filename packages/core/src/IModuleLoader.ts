import { Type, ModuleType } from './types';
import { AsyncLoadOptions } from './LoadOptions';

/**
 * module loader interface for ioc.
 *
 * @export
 * @interface IModuleLoader
 */
export interface IModuleLoader {
    /**
     * load modules by patterns
     *
     * @param {AsyncLoadOptions} options
     * @returns {Promise<ModuleType[]>}
     * @memberof IModuleLoader
     */
    load(options: AsyncLoadOptions): Promise<ModuleType[]>;

    /**
     * load module from file.
     *
     * @param {string} file
     * @returns {(ModuleType | Promise<ModuleType)}
     * @memberof IModuleLoader
     */
    loadModule(file: string): ModuleType | Promise<ModuleType>;

}
