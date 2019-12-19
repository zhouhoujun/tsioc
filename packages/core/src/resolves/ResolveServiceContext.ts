import { Token, ResolveActionContext, ResolveActionOption, createRaiseContext, IInjector } from '@tsdi/ioc';
import { TargetRef } from '../TargetService';

export type TargetRefType = Object | TargetRef;

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

    /**
     * service reference target.
     *
     * @type {(TargetRefType | TargetRefType[])}
     * @memberof ServiceActionOption
     */
    target?: TargetRefType | TargetRefType[];

    /**
     * reolve this defualt service, if not found any service.
     *
     * @type {Token<T>}
     * @memberof ServiceActionOption
     */
    defaultToken?: Token<T>;

    /**
    * ref target factory.
    *
    * @memberof ResolveServiceContext
    */
    refTargetFactory?: (targetToken: Token, token?: Token) => Token | Token[];

    /**
     * service token factory.
     *
     * @memberof ResolveServiceContext
     */
    serviceTokenFactory?: (token: Token) => Token[];
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

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ResolveServiceContext
     */
    get target(): any {
        return this.getOptions().target;
    }

    /**
     * reolve this defualt service, if not found any service.
     *
     * @type {Token}
     * @memberof ResolveServiceContext
     */
    get defaultToken(): Token {
        return this.getOptions().defaultToken;
    }

}
