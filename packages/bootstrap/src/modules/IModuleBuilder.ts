import { IContainer, Token, RefRegistration } from '@ts-ioc/core';
import { ModuleConfig } from './ModuleConfigure';
import { ContainerPool } from '../utils';
import { Runnable } from '../runnable';
import { InjectedModule } from './InjectedModule';

const moduleBuilderDesc = 'DI_ModuleBuilder';

/**
 * inject module builder token.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
export class InjectModuleBuilderToken<T> extends RefRegistration<IModuleBuilder<T>> {
    constructor(type: Token<T>) {
        super(type, moduleBuilderDesc);
    }
}

/**
 * load default container or, loaded module.
 */
export type ModuleEnv = IContainer | InjectedModule<any>;



/**
 * Generics module builder insterface.
 *
 * @export
 * @interface IGModuleBuilder
 * @template T
 */
export interface IModuleBuilder<T> {
    /**
     * get container pool
     *
     * @returns {ContainerPool}
     * @memberof IModuleBuilder
     */
    getPools(): ContainerPool;
    /**
     * load module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IModuleBuilder
     */
    load(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv): Promise<InjectedModule<T>>;

    /**
     * bootstrap module's main.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<Runnable<T>>}
     * @memberof IGModuleBuilder
     */
    bootstrap(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>>;
    /**
     * run module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<Runnable<T>>}
     * @memberof IGModuleBuilder
     */
    run(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>>;
}

/**
 * default module builder token.
 */
export const ModuleBuilderToken = new InjectModuleBuilderToken<any>(Object);

/**
 *  module builder. objected generics to any
 *
 * @export
 * @interface AnyModuleBuilder
 * @extends {IModuleBuilder<any>}
 */
export interface AnyModuleBuilder extends IModuleBuilder<any> {

}

