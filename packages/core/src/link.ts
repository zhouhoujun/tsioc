import { IInjector, IIocContainer, IProvider, Modules, Provider, Token, Type } from '@tsdi/ioc';
import { ServiceOption, ServicesOption } from './resolves/context';
import { LoadType } from './types';


/**
 * core injector.
 */
export interface ICoreInjector extends IInjector {
    /**
     * get root container.
     */
    getContainer(): IContainer;

    getServiceProvider(): IServiceProvider;
    /**
     * get container builder of this container.
     */
    getBuilder(): IContainerBuilder;

        /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     * @memberof IContainer
     */
    getLoader(): IModuleLoader;

    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     * @memberof IContainer
     */
    load(...modules: LoadType[]): Promise<Type[]>;

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: Provider[]): T;

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...Provider[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: Provider[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     * @memberof IServicesResolver
     */
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProvider;

}

/**
 * root container interface.
 *
 * @export
 * @interface IContainer
 */
export interface IContainer extends IIocContainer, ICoreInjector {
    /**
     * get root container.
     */
    getContainer(): this;
}



/**
 * container builder.
 *
 * @export
 * @interface IContainerBuilder
 */
export interface IContainerBuilder {

    /**
     * create a new container.
     *
     * @returns {IContainer}
     * @memberof IContainerBuilder
     */
    create(): IContainer;

    /**
     * create a new container and load module via options.
     *
     * @param {...LoadType[]} modules
     * @param {string} [basePath]
     * @returns {Promise<IContainer>}
     * @memberof IContainerBuilder
     */
    build(...modules: LoadType[]): Promise<IContainer>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {IContainer}
     * @memberof IContainerBuilder
     */
    syncBuild(...modules: Modules[]): IContainer;

}



/**
 * module loader interface for ioc.
 *
 * @export
 * @interface IModuleLoader
 */
export interface IModuleLoader {
    /**
     * load modules by files patterns, module name or modules.
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Modules[]>}
     * @memberof IModuleLoader
     */
    load(...modules: LoadType[]): Promise<Modules[]>;

    /**
     * dynamic require file.
     *
     * @param {string} fileName
     * @returns {Promise<any>}
     * @memberof IModuleLoader
     */
    require(fileName: string): Promise<any>;

    /**
     * load all class types in modules
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type[]>}
     * @memberof IModuleLoader
     */
    loadTypes(...modules: LoadType[]): Promise<Type[][]>;

}



/**
 * service resolver.
 *
 * @export
 * @interface IServiceResolver
 */
export interface IServiceResolver {
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: Provider[]): T;

}



/**
 * services resolver.
 *
 * @export
 * @interface IServicesResolver
 */
export interface IServicesResolver {
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...Provider[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: Provider[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     * @memberof IServicesResolver
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider;

}

/**
 * service provider.
 */
export interface IServiceProvider extends IServiceResolver, IServicesResolver {

}
