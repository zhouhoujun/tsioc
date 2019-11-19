import { ActionContextOption, IocRaiseContext, createRaiseContext, CTX_PROVIDERS } from './Action';
import { ProviderTypes } from '../providers';
import { Token } from '../types';
import { ContainerFactory } from '../IIocContainer';
import { InjectToken } from '../InjectToken';


/**
 * resovle action option.
 *
 * @export
 * @interface ResolveActionOption
 */
export interface ResolveActionOption<T> extends ActionContextOption {
    /**
     * token.
     *
     * @type {Token<T>}
     * @memberof ResolveActionOption
     */
    token?: Token<T>;

    /**
     * register token if has not register.
     *
     * @type {boolean}
     * @memberof ResolveActionOption
     */
    regify?: boolean;
    /**
     * resolver providers.
     *
     * @type {ParamProviders[]}
     * @memberof IResolveContext
     */
    providers?: ProviderTypes[];
}

export const CTX_REGIFY = new InjectToken<boolean>('CTX_REGIFY');
/**
 * resolve action context.
 *
 * @export
 * @interface IResolverContext
 */
export class ResolveActionContext<T = any> extends IocRaiseContext {

    constructor(token?: Token<T>) {
        super();
        this.token = token
    }

    /**
     * token.
     *
     * @type {Token}
     * @memberof ResolveContext
     */
    token: Token<T>;

    /**
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResolveContext
     */
    instance?: T;

    /**
     * set resolve target.
     *
     * @param {Token} token
     * @param {ProviderTypes[]} [providers]
     * @memberof ResolveContext
     */
    setOptions(options: ResolveActionOption<T>) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.token) {
            this.token = options.token;
        }
        if (options.providers) {
            this.setContext(CTX_PROVIDERS, options.providers);
        }
        if (options.regify) {
            this.setContext(CTX_REGIFY, options.regify);
        }
    }

    /**
     * create resolve context via options.
     *
     * @static
     * @param {ResolveActionOption} [options]
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(target?: Token<T> | ResolveActionOption<T>, raiseContainer?: ContainerFactory): ResolveActionContext<T> {
        return createRaiseContext<ResolveActionContext>(ResolveActionContext, target, raiseContainer);
    }
}
