import { IContainer, Type, Token } from '@ts-ioc/core';
import { ModuleConfiguration } from './ModuleConfiguration';
import { IModuleBuilder } from './IModuleBuilder';

/**
 * DI module type
 *
 * @export
 * @interface ModuleType
 * @extends {Type<T>}
 * @template T
 */
export interface ModuleType extends Type<any> {
    __di?: IContainer;
}

/**
 * ioc modules.
 *
 * @export
 * @interface IocModule
 * @template T
 */
export interface IocModule<T> {
    moduleToken?: Token<any>;
    moduleConfig: ModuleConfiguration<T>;
    container: IContainer;
    bootstrap?: Token<T>;
    modulBuilder: IModuleBuilder<T>;
}

export type ModuleInstance<T> = IocModule<T> & ModuleLoaded<T> & AfterBootCreate<T> & BeforeBootCreate<T> & ModuleStart<T> & OnModuleStarted<T>


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
