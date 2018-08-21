import { IContainer, Token } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';


/**
 * ioc DI loaded modules.
 *
 * @export
 * @interface IocModule
 * @template T
 */
export class LoadedModule {
    /**
     * token to loaded by.
     */
    token: Token<any> | ModuleConfigure;
    /**
     * module Token
     *
     * @type {Token<any>}
     * @memberof IocModule
     */
    moduleToken: Token<any>;
    /**
     * module configuration.
     *
     * @type {ModuleConfigure}
     * @memberof IocModule
     */
    moduleConfig: ModuleConfigure;
    /**
     * current ioc module di contianer.
     *
     * @type {IContainer}
     * @memberof IocModule
     */
    container: IContainer;
}

/**
 *  module instance.
 */
export type MdInstance<TM> = TM & OnModuleInit & OnModuleStart<any>;


/**
 * on module init.
 *
 * @export
 * @interface OnModuleInit
 */
export interface OnModuleInit {
    /**
     * on Module init.
     *
     * @param {LoadedModule} [mdl]
     * @memberof OnModuleInit
     */
    mdOnInit(mdl?: LoadedModule): void;
}

/**
 * module bootstrp start hook, raise hook on module bootstrap start.
 *
 * @export
 * @interface OnModuleStart
 * @template T
 */
export interface OnModuleStart<T> {
    /**
     * on Module bootstrap started.
     *
     * @param {T} [instance]
     * @memberof OnStart
     */
    mdOnStart(instance?: T): void | Promise<any>;
}
