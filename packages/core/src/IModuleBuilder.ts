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
     * get configure from module calss metadata or module config object.
     *
     * @param {(Token<any> | ModuleConfiguration<T>)} token
     * @param {(Function|string)} [moduleDecorator] default DefModule.
     * @returns {ModuleConfiguration<T>}
     * @memberof IModuleBuilder
     */
    getConfigure(token: Token<any> | ModuleConfiguration<T>, moduleDecorator?: Function|string): ModuleConfiguration<T>;

    /**
     * build module instacne.
     *
     * @param {(Token<T> | ModuleConfiguration<T>)} token build module.
     * @param {(Function|string)} [moduleDecorator] default DefModule.
     * @returns {Promise<any>}
     * @memberof IPlatform
     */
    build(token: Token<T> | ModuleConfiguration<T>, moduleDecorator?: Function|string): Promise<T>;

}

