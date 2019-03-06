import { IContainer } from '@ts-ioc/core';
import { ModuleConfig } from './ModuleConfigure';
import { ContainerPool } from '../services';
import { Runnable } from '../runnable';
import { BuildOptions } from '../annotations';
import { RefRegistration, Token, Type } from '@ts-ioc/ioc';
import { ModuleResovler } from './ModuleResovler';

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
export type ModuleEnv = IContainer | ModuleResovler<any>;

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
     * get module resolver.
     *
     * @template T
     * @param {Type<T>} type
     * @returns {ModuleResovler<T>}
     * @memberof IModuleBuilder
     */
    getModuleResovler<T>(type: Type<T>): ModuleResovler<T>;
    /**
     * load module.
     *
     * @param {Token<T>} token
     * @param {BootOptions<T>} [options]
     * @returns {Promise<ModuleResovler<T>>}
     * @memberof IModuleBuilder
     */
    load(token: Token<T>, options?: BootOptions<T>): Promise<ModuleResovler<T>>;
    /**
     * load by config.
     *
     * @param { ModuleConfig<T>} token
     * @param {BootOptions<T>} [options]
     * @returns {Promise<ModuleResovler<T>>}
     * @memberof IModuleBuilder
     */
    load(config: ModuleConfig<T>, options?: BootOptions<T>): Promise<ModuleResovler<T>>;
    /**
     * load by module and config.
     *
     * @param {Token<T>} token
     * @param {ModuleConfig<T>} config
     * @param {BootOptions<T>} [options]
     * @returns {Promise<ModuleResovler<T>>}
     * @memberof IModuleBuilder
     */
    load(token: Token<T>, config: ModuleConfig<T>, options?: BootOptions<T>): Promise<ModuleResovler<T>>;
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
