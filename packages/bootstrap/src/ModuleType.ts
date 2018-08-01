import { IContainer, Type, Token } from '@ts-ioc/core';
import { ModuleConfigure, ModuleConfiguration } from './ModuleConfiguration';

/**
 * DI module type
 *
 * @export
 * @interface DIModuleType
 * @extends {Type<T>}
 * @template T
 */
export interface DIModuleType<T> extends Type<T> {
    __di?: IContainer;
}

/**
 * DI module type
 *
 * @export
 * @interface ModuleType
 * @extends {DIModuleType<any>}
 */
export interface ModuleType extends DIModuleType<any> {
}

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
export type MdlInstance<TM> = TM & ModuleInit<any> & AfterBootCreate<any> & BeforeBootCreate<any> & ModuleStart<any> & OnModuleStarted<any>


/**
 * module before bootstrap create hook.
 *
 * @export
 * @interface BeforeBootCreate
 * @template T
 */
export interface BeforeBootCreate<T> {
    btBeforeCreate(config?: ModuleConfiguration<T>);
}

/**
 * module after bootstrap created hook.
 *
 * @export
 * @interface AfterBootCreate
 * @template T
 */
export interface AfterBootCreate<T> {
    btAfterCreate(instance: T): void;
}

export interface ModuleInit<T> {
    /**
     * on Module init.
     *
     * @param {T} instance
     * @memberof OnStart
     */
    mdOnInit(mdl: LoadedModule): void;
}

/**
 * module bootstrp start hook, raise hook on module bootstrap start.
 *
 * @export
 * @interface OnStart
 * @template T
 */
export interface ModuleStart<T> {
    /**
     * on Module bootstrap start.
     *
     * @param {T} instance
     * @memberof OnStart
     */
    mdOnStart(instance: T): void | Promise<any>;
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
     * @param {T} instance
     * @memberof OnStart
     */
    mdOnStarted(instance: T): void;
}
