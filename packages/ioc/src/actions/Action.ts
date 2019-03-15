import { IIocContainer } from '../IIocContainer';
import { ProviderTypes } from '../providers';
import { Type, Token } from '../types';
import { IocCoreService } from '../services';
import { lang } from '../utils';
import { IResolverContainer } from '../IResolver';

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
     * raise container accessor.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer: () => IIocContainer;

    /**
     * resolve conatiner.
     *
     * @memberof IocActionContext
     */
    getContainer?: () => IResolverContainer;

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
     * @param {() => IResolverContainer} containerGetter
     * @param {() => IIocContainer} raiseContainerGetter
     * @memberof IocActionContext
     */
    setContext(raiseContainerGetter: () => IIocContainer, containerGetter?: () => IResolverContainer) {
        this.getContainer = containerGetter;
        this.getRaiseContainer = raiseContainerGetter;
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
        if (this.getContainer) {
            return this.getContainer().has(token);
        } else {
            return this.getRaiseContainer().has(token);
        }
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
        if (this.getContainer) {
            return this.getContainer().resolve(token, ...providers);
        } else {
            return this.getRaiseContainer().get(token, ...providers);
        }
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

