import { createRaiseContext, IocProvidersContext, IocProvidersOption } from './Action';
import { Token } from '../types';
import { ContainerFactory } from '../IIocContainer';
import { InjectToken } from '../InjectToken';


/**
 * resovle action option.
 *
 * @export
 * @interface ResolveActionOption
 */
export interface ResolveActionOption<T> extends IocProvidersOption {
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

}

export const CTX_RESOLVE_REGIFY = new InjectToken<boolean>('CTX_RESOLVE_REGIFY');
/**
 * resolve action context.
 *
 * @export
 * @interface IResolverContext
 */
export class ResolveActionContext<T = any> extends IocProvidersContext {

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
        if (options.regify) {
            this.setContext(CTX_RESOLVE_REGIFY, options.regify);
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
