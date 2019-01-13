import { IContainer, Token, RefRegistration, Type } from '@ts-ioc/core';
import { ModuleConfig } from './ModuleConfigure';
import { ContainerPool } from '../utils';
import { Runnable } from '../runnable';
import { InjectedModule } from './InjectedModule';
import { BuildOptions } from '../annotations';

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
 * boot options.
 *
 * @export
 * @interface BootOptions
 * @extends {BuildOptions<T>}
 * @template T
 */
export interface BootOptions<T> extends BuildOptions<T> {
    env?: ModuleEnv;
}

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
     * get registered inject module.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {InjectedModule<T>}
     * @memberof IModuleBuilder
     */
    getInjectedModule<T>(type: Type<T>): InjectedModule<T>;
    /**
     * load module.
     *
     * @param {Token<T>} token
     * @param {BootOptions<T>} [options]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IModuleBuilder
     */
    load(token: Token<T>, options?: BootOptions<T>): Promise<InjectedModule<T>>;
    /**
     * load by config.
     *
     * @param { ModuleConfig<T>} token
     * @param {BootOptions<T>} [options]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IModuleBuilder
     */
    load(config: ModuleConfig<T>, options?: BootOptions<T>): Promise<InjectedModule<T>>;
    /**
     * load by module and config.
     *
     * @param {Token<T>} token
     * @param {ModuleConfig<T>} config
     * @param {BootOptions<T>} [options]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IModuleBuilder
     */
    load(token: Token<T>, config: ModuleConfig<T>, options?: BootOptions<T>): Promise<InjectedModule<T>>;
    /**
     * bootstrap module.
     *
     * @param {Token<T>} token
     * @param {BootOptions<T>} [options]
     * @returns {Promise<Runnable<T>>}
     * @memberof IModuleBuilder
     */
    bootstrap(token: Token<T>,  options?: BootOptions<T>): Promise<Runnable<T>>;
    /**
     * bootstrap module config.
     *
     * @param {ModuleConfig<T>} config
     * @param {BootOptions<T>} [options]
     * @returns {Promise<Runnable<T>>}
     * @memberof IModuleBuilder
     */
    bootstrap(config: ModuleConfig<T>,  options?: BootOptions<T>): Promise<Runnable<T>>;
    /**
     * bootstrap with module and config.
     *
     * @param {Token<T>} token
     * @param {ModuleConfig<T>} config
     * @param {BootOptions<T>} options
     * @returns {Promise<Runnable<T>>}
     * @memberof IModuleBuilder
     */
    bootstrap(token: Token<T>,  config: ModuleConfig<T>,  options: BootOptions<T>): Promise<Runnable<T>>;

}

/**
 * default module builder token.
 */
export const ModuleBuilderToken = new InjectModuleBuilderToken<any>(Object);
