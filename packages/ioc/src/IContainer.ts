import { Token, ProviderType } from './tokens';
import { IActionProvider, IInjector, IProvider, RegisteredState, ServiceOption, ServicesOption } from './IInjector';
import { Strategy } from './strategy';

/**
 * root container interface.
 *
 * @export
 * @interface IIocContainer
 */
export interface IContainer extends IInjector {

    readonly id: string;
    /**
     * registered state.
     */
    readonly regedState: RegisteredState;
    /**
     * action provider.
     */
    readonly provider: IActionProvider;

    /**
     * provider default strategy.
     */
    readonly providerStrategy: Strategy;
    /**
     * injector default strategy.
     */
    readonly injectorStrategy: Strategy;
    /**
     * null provider.
     */
    readonly NULL_PROVIDER: IProvider;
    /**
     * create injector.
     */
    createInjector(): IInjector;
}

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
