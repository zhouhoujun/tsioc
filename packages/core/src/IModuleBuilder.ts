import { IContainer } from './IContainer';
import { Type, LoadType, Token } from './types';
import { ModuleConfiguration } from './ModuleConfiguration';
import { InjectToken } from './InjectToken';

/**
 * module builder token.
 */
export const ModuleBuilderToken = new InjectToken<IModuleBuilder<any>>('__IOC_ModuleBuilder');


/**
 * module builder
 *
 * @export
 * @interface IModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T> {

    /**
     * get configure from module.
     *
     * @param {(Token<any> | ModuleConfiguration<T>)} modules
     * @returns {ModuleConfiguration<T>}
     * @memberof IModuleBuilder
     */
    getConfigure(modules: Token<any> | ModuleConfiguration<T>): ModuleConfiguration<T>;

    /**
     * build module instacne.
     *
     * @param {(Token<T> | ModuleConfiguration<T>)} modules build module.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    build(modules: Token<T> | ModuleConfiguration<T>): Promise<T>;

}

