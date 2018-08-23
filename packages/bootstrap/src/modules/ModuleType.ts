import { IContainer, Token } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';
import { InjectedModule } from './InjectedModule';




// /**
//  * ioc DI loaded modules.
//  *
//  * @export
//  * @interface IocModule
//  * @template T
//  */
// export class InjectedModule {
//     /**
//      * token to loaded by.
//      */
//     token: Token<any> | ModuleConfigure;
//     /**
//      * module Token
//      *
//      * @type {Token<any>}
//      * @memberof IocModule
//      */
//     moduleToken: Token<any>;
//     /**
//      * module configuration.
//      *
//      * @type {ModuleConfigure}
//      * @memberof IocModule
//      */
//     moduleConfig: ModuleConfigure;
//     /**
//      * current ioc module di contianer.
//      *
//      * @type {IContainer}
//      * @memberof IocModule
//      */
//     container: IContainer;
// }

/**
 *  module instance.
 */
export type MdInstance<T> = T & OnModuleInit<T> & OnModuleStart<any>;


/**
 * on module init.
 *
 * @export
 * @interface OnModuleInit
 */
export interface OnModuleInit<T> {
    /**
     * on Module init.
     *
     * @param {InjectedModule} [mdl]
     * @memberof OnModuleInit
     */
    mdOnInit(mdl?: InjectedModule<T>): void;
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
