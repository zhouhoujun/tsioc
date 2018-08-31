import { Registration, IContainer, Token } from '@ts-ioc/core';
import { ModuleConfig } from './ModuleConfigure';
import { MdInstance } from './ModuleType';
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
export class InjectModuleBuilderToken<T> extends Registration<IModuleBuilder<T>> {
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
     * import module.
     *
     * @param {Token<T>} module
     * @param {IContainer} [parent]
     * @returns {Promise<InjectedModule<T>>}
     * @memberof IModuleBuilder
     */
    import(module: Token<T>, parent?: IContainer): Promise<InjectedModule<T>>;

    /**
     * build module as ioc container.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    build(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<T>;



    /**
     * bootstrap module's main.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<MdInstance<T>>}
     * @memberof IGModuleBuilder
     */
    bootstrap(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>>;

}

/**
 * default module builder token.
 */
export const DefaultModuleBuilderToken = new InjectModuleBuilderToken<any>(Object);

/**
 * module builder token.
 */
export const ModuleBuilderToken = new Registration<AnyModuleBuilder>('any', moduleBuilderDesc);

/**
 *  module builder. objected generics to any
 *
 * @export
 * @interface AnyModuleBuilder
 * @extends {IModuleBuilder<any>}
 */
export interface AnyModuleBuilder extends IModuleBuilder<any> {

    /**
     * build module as ioc container.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof AnyModuleBuilder
     */
    build<T>(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<MdInstance<T>>;

}

