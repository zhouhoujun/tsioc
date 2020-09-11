import { IInjector, Token, Provider, IProvider, Type } from '@tsdi/ioc';
import { ServiceOption, ServicesOption } from './resolves/context';
import { ServiceProvider } from './services/providers';
import { IContainerBuilder } from './IContainerBuilder';
import { IModuleLoader } from './services/loader';
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
