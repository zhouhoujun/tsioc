import { Token, ResolveActionContext, ResolveActionOption, createRaiseContext, IInjector } from '@tsdi/ioc';

/**
 * service context option.
 *
 * @export
 * @interface ServiceOption
 * @extends {ResovleActionOption}
 */
export interface ServiceOption<T> extends ResolveActionOption<T> {
    /**
     * token provider service type.
     *
     * @type {Type}
     * @memberof ServiceActionOption
     */
    tokens?: Token<T>[];

    /**
     * get extend servie or not.
     *
     * @type {boolean}
     * @memberof ServiceOption
     */
    extend?: boolean;
}

/**
 * service resolve context.
 *
 * @export
 * @class ResolveServiceContext
 * @extends {ResovleActionContext}
 */
export class ResolveServiceContext<T = any, TOP extends ServiceOption<T> = ServiceOption<T>> extends ResolveActionContext<T, TOP> {
    /**
     * create resolve context via options.
     *
     * @static
     * @param { IInjector } injecor
     * @param {ServiceOption<T>} options
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(injecor: IInjector, options: ServiceOption<T>): ResolveServiceContext<T> {
        return createRaiseContext<ResolveServiceContext>(injecor, ResolveServiceContext, options);
    }

    /**
     * service tokens.
     *
     * @type {Type}
     * @memberof ResolveServiceContext
     */
    get tokens(): Token[] {
        return this.getOptions().tokens;
    }

}
