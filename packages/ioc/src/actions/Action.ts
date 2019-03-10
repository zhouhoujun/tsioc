import { IIocContainer } from '../IIocContainer';
import { ProviderTypes } from '../providers';
import { Type, Token, InstanceFactory } from '../types';
import { IocCoreService } from '../services';
import { lang } from '../utils';

/**
 * action context option.
 *
 * @export
 * @interface ActionContextOption
 */
export interface ActionContextOption {
    
    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ActionContextOption
     */
    token?: Token<any>;
}

/**
 * ioc action context.
 *
 * @export
 * @class IocActionContext
 */
export class IocActionContext {
    /**
     * factories.
     *
     * @type {Map<Token<any>, InstanceFactory<any>>}
     * @memberof ResovleContext
     */
    private getFactories: () => Map<Token<any>, InstanceFactory<any>>;

    /**
     * raise container accessor.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer: () => IIocContainer;

    /**
     * token.
     *
     * @type {Token<any>}
     * @memberof ResovleContext
     */
    token: Token<any>;


    constructor() {

    }

    /**
     * set resolve context.
     *
     * @param {Token<any>} token
     * @param {ProviderTypes[]} [providers]
     * @memberof ResovleContext
     */
    setContext(containerGetter: () => IIocContainer, factoriesGetter: () => Map<Token<any>, InstanceFactory<any>>) {
        this.getRaiseContainer = containerGetter;
        this.getFactories = factoriesGetter;
    }

    /**
     * set options.
     *
     * @param {ActionContextOption} options
     * @memberof IocActionContext
     */
    setOptions(options: ActionContextOption) {
        if (options) {
            Object.assign(this,
                lang.omit(options, 'setOptions', 'getRaiseContainer', 'getFactories',
                    'getTokenProvider', 'has', 'resolve', 'unregister'));
        }
    }

    /**
     * get token provider.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {Type<T>}
     * @memberof ResovleContext
     */
    getTokenProvider<T>(token: Token<T>): Type<T> {
        return this.getRaiseContainer().getTokenProvider(token);
    }

    /**
     * has register token.
     *
     * @template T
     * @memberof IResovleContext
     */
    has<T>(token: Token<T>): boolean {
        let key = this.getRaiseContainer().getTokenKey(token);
        let factories = this.getFactories();
        if (factories) {
            return factories.has(key);
        }
        return false;
    }

    /**
     * resolve token in factories.
     *
     * @template T
     * @param {Token<T>} token
     * @param {...ProviderTypes[]} providers
     * @returns {T}
     * @memberof ResovleContext
     */
    resolve<T>(token: Token<T>, ...providers: ProviderTypes[]): T {
        let key = this.getRaiseContainer().getTokenKey(token);
        let factories = this.getFactories();
        if (factories) {
            let factory = factories.get(key);
            return factory(...providers);
        }
        return null;
    }

    /**
     * unregister token in rasie container.
     *
     * @template T
     * @param {Token<T>} token
     * @returns {this}
     * @memberof ResovleContext
     */
    unregister<T>(token: Token<T>): this {
        this.getRaiseContainer().unregister(token);
        return this;
    }
}


/**
 * action.
 *
 * @export
 * @abstract
 * @class Action
 * @extends {IocCoreService}
 */
export abstract class IocAction<T extends IocActionContext> extends IocCoreService {
    constructor() {
        super();
    }

    abstract execute(ctx: T, next: () => void): void;
}

export type IocActionType = Type<IocAction<any>> | IocAction<any> | lang.IAction<any>;

