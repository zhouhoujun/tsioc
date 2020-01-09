import { IInjector, Token, ProviderTypes, IProviders, Modules, LoadType, Type } from '@tsdi/ioc';
import { ServiceOption } from './resolves/service/ResolveServiceContext';
import { ServicesOption } from './resolves/services/ResolveServicesContext';
import { ServiceProvider } from './services/ServiceProvider';
import { ModuleProvider } from './services/ModuleProvider';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader } from './services/ModuleLoader';

export interface ICoreInjector extends IInjector {

    getServiceProvider(): ServiceProvider;

    getModuleProvider(): ModuleProvider;
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
     * use modules.
     *
     * @param {...Modules[]} modules
     * @returns {this}
     * @memberof IContainer
     */
    use(...modules: Modules[]): this;

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
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof IContainer
     */
    getService<T>(target: Token<T> | ServiceOption<T>, ...providers: ProviderTypes[]): T;

    /**
     * get all service extends type.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target servive token or express match token.
     * @param {...ProviderTypes[]} providers
     * @returns {T[]} all service instance type of token type.
     * @memberof IContainer
     */
    getServices<T>(target: Token<T> | ServicesOption<T>, ...providers: ProviderTypes[]): T[];

    /**
     * get all provider service in the injector.
     *
     * @template T
     * @param {(Token<T> | ServicesOption<T>)} target
     * @returns {IProviders}
     * @memberof IServicesResolver
     */
    getServiceProviders<T>(target: Token<T> | ServicesOption<T>): IProviders;

}
