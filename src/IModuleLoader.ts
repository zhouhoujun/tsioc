import { Type } from './Type';
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
     * @returns {Promise<(Type<any> | object)[]>}
     * @memberof IModuleLoader
     */
    load(options: AsyncLoadOptions): Promise<(Type<any> | object)[]>;

    /**
     * load module from file.
     *
     * @param {string} file
     * @returns {(Type<any> | object | Promise<Type<any> | object>)}
     * @memberof IModuleLoader
     */
    loadModule(file: string): Type<any> | object | Promise<Type<any> | object>;

}
