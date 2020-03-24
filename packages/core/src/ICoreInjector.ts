import { IInjector, Token, ProviderTypes, IProviders, Type } from '@tsdi/ioc';
import { ServiceOption } from './resolves/ServiceContext';
import { ServicesOption } from './resolves/ServicesContext';
import { ServiceProvider } from './services/ServiceProvider';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader } from './services/ModuleLoader';
import { IContainer } from './IContainer';
import { LoadType } from './types';


export interface ICoreInjector extends IInjector {
    /**
     * get root container.
     */
    getContainer(): IContainer;

    getServiceProvider(): ServiceProvider;
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
