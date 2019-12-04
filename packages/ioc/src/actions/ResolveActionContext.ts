import { Token } from '../types';
import { ContainerFactory } from '../IIocContainer';
import { createRaiseContext, IocProvidersContext, IocProvidersOption } from './Action';

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
     * @param {ResolveActionOption} [options]
     * @param {ContainerFactory} [raiseContainer]
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(options: ResolveActionOption<T>, raiseContainer?: ContainerFactory): ResolveActionContext<T> {
        return createRaiseContext<ResolveActionContext>(ResolveActionContext, options, raiseContainer);
    }
}
