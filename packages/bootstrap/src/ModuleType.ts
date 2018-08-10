import { IContainer, Token } from '@ts-ioc/core';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';


/**
 * ioc DI loaded modules.
 *
 * @export
 * @interface IocModule
 * @template T
 */
export class LoadedModule {
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
export type MdlInstance<TM> = TM & OnModuleInit & AfterAnnotationCreate<any> & BeforeAnnotationCreate<any> & OnModuleStart<any> & OnModuleStarted<any>


/**
 * Before Annotation class create hook.
 *
 * @export
 * @interface BeforeAnnotationCreate
 * @template T
 */
export interface BeforeAnnotationCreate<T> {
    anBeforeCreate(config?: ModuleConfig<T>);
}

/**
 * After Annotation classp created hook.
 *
 * @export
 * @interface AfterBootCreate
 * @template T
 */
export interface AfterAnnotationCreate<T> {
    anAfterCreate(instance: T): void;
}

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
     * on Module bootstrap start.
     *
     * @param {T} [instance]
     * @memberof OnStart
     */
    mdOnStart(instance?: T): void | Promise<any>;
}

/**
 * on Module started.
 *
 * @export
 * @interface OnStart
 * @template T
 */
export interface OnModuleStarted<T> {
    /**
     * on Module onStarted.
     *
     * @param {T} [instance]
     * @memberof OnStart
     */
    mdOnStarted(instance?: T): void;
}
