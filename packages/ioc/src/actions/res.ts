import { Token } from '../tokens';
import { IInjector } from '../IInjector';
import { IocAction, createContext, IocPdrsContext, IocPdrsOption, IIocPdrsContext } from './Action';
import { CTX_TOKEN, CTX_DEFAULT_TOKEN }  from '../utils/tk';

/**
 * resovle action option.
 *
 */
export interface ResolveOption<T = any> extends IocPdrsOption {
    /**
     * token.
     *
     */
    token?: Token<T>;
    /**
     * resolve token in target context.
     */
    target?: Token | Object | (Token | Object)[];
    /**
     * only for target private or ref token. if has target.
     */
    tagOnly?: boolean;
    /**
     * all faild use the default token to get instance.
     */
    defaultToken?: Token<T>;
    /**
     * register token if has not register.
     *
     */
    regify?: boolean;

}

export interface IResolveContext<T = any, TOP extends ResolveOption<T> = ResolveOption<T>> extends IIocPdrsContext<TOP> {
    readonly token: Token<T>;
    readonly defaultToken: Token<T>;
    /**
     * reslove result instance.
     *
     * @type {*}
     */
    instance?: T;
}

/**
 * resolve action context.
 */
export class ResolveContext<T = any, TOP extends ResolveOption<T> = ResolveOption<T>>
    extends IocPdrsContext<TOP> implements IResolveContext<T, TOP> {

    /**
     * token.
     *
     * @type {Token}
     * @memberof ResolveContext
     */
    get token(): Token<T> {
        return this.getValue(CTX_TOKEN);
    }

    get defaultToken(): Token<T> {
        return this.getValue(CTX_DEFAULT_TOKEN);
    }

    /**
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResolveContext
     */
    instance?: T;

    /**
     * create resolve context via options.
     *
     * @static
     * @param {IInjector} injector
     * @param {ResolveOption} options
     * @returns {ResolveContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(injector: IInjector, options: ResolveOption<T>): ResolveContext<T> {
        return createContext<ResolveContext>(injector, ResolveContext, options);
    }

    setOptions(options: TOP) {
        if (!options) {
            return this;
        }
        if (options.token) {
            this.setValue(CTX_TOKEN, options.token);
        }
        if (options.defaultToken) {
            this.setValue(CTX_DEFAULT_TOKEN, options.defaultToken);
        }
        return super.setOptions(options);
    }
}


/**
 * ioc Resolve action.
 *
 * the Resolve type class can only Resolve in ioc as:
 * ` container.ResolveSingleton(SubResolveAction, () => new SubResolveAction(container));`
 * @export
 * @abstract
 * @class IocResolveAction
 * @extends {IocAction<T>}
 * @template T
 */
export abstract class IocResolveAction<T extends ResolveContext = ResolveContext> extends IocAction<T> {

}
