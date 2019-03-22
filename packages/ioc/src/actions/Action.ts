import { IIocContainer } from '../IIocContainer';
import { ProviderTypes } from '../providers';
import { Type, Token } from '../types';
import { IocCoreService } from '../services';
import { lang, isFunction } from '../utils';
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

    private raiseContainerGetter: () => IIocContainer;

    private providersGetter?: () => IResolverContainer


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
     * get raise container.
     *
     * @memberof ResovleContext
     */
    getRaiseContainer() {
        if (this.raiseContainerGetter) {
            return this.raiseContainerGetter();
        } else {
            throw new Error('has not setting raise container');
        }
    }

    setRaiseContainer(raiseContainer: IIocContainer | (() => IIocContainer)) {
        if (isFunction(raiseContainer)) {
            this.raiseContainerGetter = raiseContainer;
        } else {
            this.raiseContainerGetter = () => raiseContainer;
        }
    }

    /**
     *  get provider resolve conatiner.
     *
     * @memberof IocActionContext
     */
    getProviderContainer(): IResolverContainer {
        if (this.providersGetter) {
            return this.providersGetter();
        } else {
            throw new Error('has not setting raise container');
        }
    }

    setProviderContainer(providersGetter: IResolverContainer | (() => IResolverContainer)) {
        if (isFunction(providersGetter)) {
            this.providersGetter = providersGetter;
        } else {
            this.providersGetter = () => providersGetter;
        }
    }

    /**
     * parse context.
     *
     * @static
     * @param {ActionContextOption} options
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainerGetter]
     * @param {(IResolverContainer | (() => IResolverContainer))} [providersGetter]
     * @returns {IocActionContext}
     * @memberof IocActionContext
     */
    static parse(options: ActionContextOption, raiseContainerGetter?: IIocContainer | (() => IIocContainer), providersGetter?: IResolverContainer | (() => IResolverContainer)): IocActionContext {
        let ctx = new IocActionContext();
        ctx.setContext(ctx, options, raiseContainerGetter, providersGetter);
        return ctx;
    }


    setContext(ctx: IocActionContext, options: ActionContextOption, raiseContainerGetter?: IIocContainer | (() => IIocContainer), providersGetter?: IResolverContainer | (() => IResolverContainer)) {
        ctx.setOptions(options);
        if (raiseContainerGetter) {
            ctx.setRaiseContainer(raiseContainerGetter);
        }
        if (providersGetter) {
            ctx.setProviderContainer(providersGetter);
        }
    }

    /**
     * set options.
     *
     * @param {ActionContextOption} options
     * @memberof IocActionContext
     */
    setOptions(options: ActionContextOption) {
        if (options) {
            Object.assign(this, options);
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
        if (this.providersGetter) {
            return this.getProviderContainer().has(token);
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
        if (this.providersGetter) {
            return this.getProviderContainer().resolve(token, ...providers);
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

