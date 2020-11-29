import { IInjector, IIocContainer, IProvider, Modules, ProviderType, Token, Type } from '@tsdi/ioc';
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

    /**
     * get container builder of this container.
     */
    getBuilder(): IContainerBuilder;

    /**
     * get module loader.
     *
     * @returns {IModuleLoader}
     */
    getLoader(): IModuleLoader;

    /**
     * load modules.
     *
     * @param {...LoadType[]} modules load modules.
     * @returns {Promise<Type[]>}  types loaded.
     */
    load(...modules: LoadType[]): Promise<Type[]>;

    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T;

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
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
     * service provider.
     */
    readonly serv: IServiceProvider;
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
     */
    create(): IContainer;

    /**
     * create a new container and load module via options.
     *
     * @param {...LoadType[]} modules
     * @param {string} [basePath]
     * @returns {Promise<IContainer>}
     */
    build(...modules: LoadType[]): Promise<IContainer>;

    /**
     * build container in sync.
     *
     * @param {LoadOptions} options
     * @returns {IContainer}
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
     */
    load(...modules: LoadType[]): Promise<Modules[]>;

    /**
     * dynamic require file.
     *
     * @param {string} fileName
     * @returns {Promise<any>}
     */
    require(fileName: string): Promise<any>;

    /**
     * load all class types in modules
     *
     * @param {...LoadType[]} modules
     * @returns {Promise<Type[]>}
     */
    loadTypes(...modules: LoadType[]): Promise<Type[][]>;

}


/**
 * service provider.
 */
export interface IServiceProvider {
    /**
     * get service or target reference service in the injector.
     *
     * @template T
     * @param { IInjector } injector
     * @param {(Token<T> | ServiceOption<T>)} target servive token.
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    getService<T>(injector: IInjector, target: Token<T> | ServiceOption<T>, ...providers: ProviderType[]): T;
    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderType[]} providers
     * @returns {T[]} all service instance type of token type.
     */
    getServices<T>(injector: IInjector, target: Token<T> | ServicesOption<T>, ...providers: ProviderType[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProvider}
     */
    getServiceProviders<T>(injector: IInjector, target: Token<T> | ServicesOption<T>): IProvider;
}