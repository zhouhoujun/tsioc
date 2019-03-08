import { SymbolType, Token, InstanceFactory } from './types';
import { IIocContainer } from './IIocContainer';
import { ProviderTypes } from './providers';

/**
 * reslv
 *
 * @export
 * @interface IResovlerContext
 */
export class ResovleContext {

    /**
     * container, the action raise from.
     *
     * @type {IContainer}
     * @memberof ActionData
     */
    raiseContainer: IIocContainer;
    /**
     * resolver providers.
     *
     * @type {ParamProviders[]}
     * @memberof IResovleContext
     */
    providers: ProviderTypes[];
    /**
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResovleContext
     */
    instance?: any;

    /**
     * factories.
     *
     * @type {Map<Token<any>, InstanceFactory<any>>}
     * @memberof ResovleContext
     */
    factories: Map<Token<any>, InstanceFactory<any>>;

    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ResovleContext
     */
    token: Token<any>;

    /**
     * resovle key.
     *
     * @type {SymbolType<any>}
     * @memberof IResovleContext
     */
    tokenKey: SymbolType<any>;

    constructor(token: Token<any>, container: IIocContainer, providers?: ProviderTypes[], factories?: Map<Token<any>, InstanceFactory<any>>) {
        this.token = token;
        this.tokenKey = container.getTokenKey(token);
        this.raiseContainer = container;
        this.providers = providers || [];
        this.factories = factories;
    }

    /**
     * has register token.
     *
     * @template T
     * @memberof IResovleContext
     */
    has<T>(key: SymbolType<T>): boolean {
        if (this.factories) {
            return this.factories.has(key);
        }
        return false;
    }

    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        return this.get(this.raiseContainer.getTokenKey(token), ...providers);
    }

    /**
     * factory.
     *
     * @memberof IResovleContext
     */
    get<T>(key: SymbolType<T>, ...providers: ProviderTypes[]): T {
        if (this.factories) {
            let factory = this.factories.get(key);
            return factory(...providers);
        }
        return null;
    }

}
