import { Registration, IContainer, Token } from '@ts-ioc/core';
import { ModuleConfigure, ModuleConfig } from './ModuleConfigure';
import { MdInstance, LoadedModule } from './ModuleType';
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
     * set container pool.
     *
     * @param {ContainerPool} pools
     * @memberof IModuleBuilder
     */
    setPools(pools: ContainerPool);

    // /**
    //  * load module depdences.
    //  *
    //  * @param {(Token<T> | ModuleConfigure)} token
    //  * @param {ModuleEnv} [env] set loadedModule will return loaded container; set default container or not. not set will create new container.
    //  * @param {IContainer} [parent] set the container parent, default will set root default container.
    //  * @returns {Promise<LoadedModule>}
    //  * @memberof IModuleBuilder
    //  */
    // load(token: Token<T> | ModuleConfigure, env?: ModuleEnv, parent?: IContainer): Promise<LoadedModule>;

    /**
     * build module as ioc container.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    build(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<T>;

    /**
     * get module builder
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @returns {IModuleBuilder<T>}
     * @memberof IModuleBuilder
     */
    getBuilder(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv): IModuleBuilder<T>;

    /**
     * bootstrap module's main.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data]
     * @returns {Promise<MdInstance<T>>}
     * @memberof IGModuleBuilder
     */
    bootstrap(token: Token<T> | ModuleConfig<T>, env?: ModuleEnv, data?: any): Promise<Runnable<T>>;

    // /**
    //  * import di module.
    //  *
    //  * @param {(Type<any> | ModuleConfigure)} token di module type
    //  * @param {IContainer} container container to import module.
    //  * @returns {Promise<IContainer>}
    //  * @memberof IModuleBuilder
    //  */
    // importModule(token: Type<any> | ModuleConfigure, container: IContainer): Promise<IContainer>;

    /**
     * register module depdences.
     *
     * @param {IContainer} container
     * @param {ModuleConfigure} config
     * @returns {Promise<ModuleConfigure>}
     * @memberof IModuleBuilder
     */
    registerDepdences(container: IContainer, config: ModuleConfigure): Promise<ModuleConfigure>;

    /**
     * get the module define decorator or decorator name.
     *
     * @returns {(Function | string)}
     * @memberof IModuleBuilder
     */
    getDecorator(): Function | string;

    /**
     * get configure from module calss metadata or module config object.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {IContainer} [container] container.
     * @returns {ModuleConfigure}
     * @memberof IModuleBuilder
     */
    getConfigure(token: Token<T> | ModuleConfigure, container?: IContainer): ModuleConfigure;
}

/**
 * default module builder token.
 */
export const DefaultModuleBuilderToken = new InjectModuleBuilderToken<any>(Object);

/**
 * module builder token.
 */
export const ModuleBuilderToken = new Registration<AnyModuleBuilder>(Object, moduleBuilderDesc);

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

