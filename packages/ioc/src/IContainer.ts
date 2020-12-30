
import { IInjector, IProvider, ServiceOption, ServicesOption } from './IInjector';
import { FactoryLike, ProviderType, Token } from './tokens';
import { Type } from './types';
import { IActionInjector, IActionProvider } from './actions/Action';
import { ITypeReflects } from './services/ITypeReflects';



/**
 * root container interface.
 *
 * @export
 * @interface IIocContainer
 */
export interface IContainer extends IInjector {

    readonly id: string;

    /**
     * action provider.
     */
    readonly provider: IActionProvider;

    /**
     * get action injector.
     * @deprecated  use `provider` instead.
     */
    getActionInjector(): IActionInjector;

    /**
     * get type reflects.
     */
    getTypeReflects(): ITypeReflects;
    /**
     * get root contianer.
     */
    getContainer(): this;

    getInjector(type: Type): IInjector;
    /**
     * create injector.
     */
    createInjector(): IInjector;
    /**
     * register type class.
     * @param {IProvider} injector
     * @param Type the class.
     * @param [options] the class prodvider to.
     */
    registerIn<T>(injector: IProvider, type: Type<T>, options?: { provide?: Token<T>, singleton?: boolean, regIn?: 'root' }): this;
    /**
     * register factory to injector.
     * @param injector the injector to register.
     * @param token register token
     * @param fac factory of token.
     * @param singleton singlteon or not.
     */
    registerFactory<T>(injector: IProvider, token: Token<T>, fac?: FactoryLike<T>, singleton?: boolean): this;
}

/**
 * @deprecated use `IContainer` instead.
 */
export type IIocContainer = IContainer;

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
