import { Token, ClassType } from '../types';
import { createRaiseContext, IocProvidersContext, IocProvidersOption } from './IocAction';
import { IInjector } from '../IInjector';

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
     * resolve token in target context.
     */
    target?: Token | Object;
    /**
     * all faild use the default token to get instance.
     */
    default?: Token<T>;
    /**
     * register token if has not register.
     *
     * @type {boolean}
     * @memberof ResolveActionOption
     */
    regify?: boolean;

}


/**
 * resolve action context.
 *
 * @export
 * @interface IResolverContext
 */
export class ResolveActionContext<T = any, TOP extends ResolveActionOption<T> = ResolveActionOption<T>> extends IocProvidersContext<TOP> {

    /**
     * token.
     *
     * @type {Token}
     * @memberof ResolveContext
     */
    get token(): Token<T> {
        return this.getOptions().token;
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
     * @param {ResolveActionOption} options
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(injector: IInjector, options: ResolveActionOption<T>): ResolveActionContext<T> {
        return createRaiseContext<ResolveActionContext>(injector, ResolveActionContext, options);
    }
}
