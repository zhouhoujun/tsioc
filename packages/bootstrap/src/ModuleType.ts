import { IContainer, Type, Token } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';
import { IBootstrapBuilder } from './IBootstrapBuilder';

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
 * ioc DI modules.
 *
 * @export
 * @interface IocModule
 * @template T
 */
export interface IocModule<T> {
    /**
     * di module token.
     *
     * @type {Token<any>}
     * @memberof IocModule
     */
    moduleToken?: Token<any>;
    /**
     * module configuration.
     *
     * @type {ModuleConfiguration<T>}
     * @memberof IocModule
     */
    moduleConfig: ModuleConfiguration<T>;
    /**
     * current ioc module di contianer.
     *
     * @type {IContainer}
     * @memberof IocModule
     */
    container: IContainer;
    /**
     * bootstrap token.
     *
     * @type {Token<T>}
     * @memberof IocModule
     */
    bootstrap?: Token<T>;
    /**
     * bootstrap builder.
     *
     * @type {IBootstrapBuilder}
     * @memberof IocModule
     */
    bootBuilder: IBootstrapBuilder<T>;
    /**
     * bootstrap instance.
     *
     * @type {T}
     * @memberof IocModule
     */
    bootInstance?: T;
}

/**
 *  module instance.
 */
export type MdlInstance<TM> = TM & IocModule<any> & ModuleLoaded<any> & AfterBootCreate<any> & BeforeBootCreate<any> & ModuleStart<any> & OnModuleStarted<any>


/**
 * module loaded hook, raise hook after all depdences loaded.
 *
 * @export
 * @interface ModuleLoaded
 * @template T
 */
export interface ModuleLoaded<T> {
    mdOnLoaded(iocModule?: IocModule<T>): void;
}

/**
 * module before bootstrap create hook.
 *
 * @export
 * @interface BeforeBootCreate
 * @template T
 */
export interface BeforeBootCreate<T> {
    mdBeforeCreate(iocModule?: IocModule<T>);
}

/**
 * module after bootstrap created hook.
 *
 * @export
 * @interface AfterBootCreate
 * @template T
 */
export interface AfterBootCreate<T> {
    mdAfterCreate(instance: T): void;
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
