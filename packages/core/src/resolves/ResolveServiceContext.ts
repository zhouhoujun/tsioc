import { Token, ResolveActionContext, ResolveActionOption, createRaiseContext, ContainerFactory } from '@tsdi/ioc';
import { TargetRef } from '../TargetService';
import { CTX_TARGET_REF_FACTORY, CTX_SERVICE_TOKEN_FACTORY } from '../contextTokens';


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
export class ResolveServiceContext<T = any> extends ResolveActionContext<T> {

    constructor(token?: Token<T>) {
        super(token)
    }
    /**
     * create resolve context via options.
     *
     * @static
     * @param {ResolveActionOption} [options]
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(target?: Token<T> | ServiceOption<T>, raiseContainer?: ContainerFactory): ResolveServiceContext<T> {
        return createRaiseContext<ResolveServiceContext>(ResolveServiceContext, target, raiseContainer);
    }

    /**
     * get extend servie or not.
     *
     * @type {boolean}
     * @memberof ServiceOption
     */
    extend?: boolean;

    /**
     * service tokens.
     *
     * @type {Type}
     * @memberof ResolveServiceContext
     */
    tokens: Token[];

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ResolveServiceContext
     */
    target?: any;

    /**
     * reolve this defualt service, if not found any service.
     *
     * @type {Token}
     * @memberof ResolveServiceContext
     */
    defaultToken?: Token;

    setOptions(options: ServiceOption<T>) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (options.tokens) {
            this.tokens = options.tokens;
        }
        if (options.target) {
            this.target = options.target;
        }
        if (options.extend) {
            this.extend = options.extend;
        }
        if (options.defaultToken) {
            this.defaultToken = options.defaultToken;
        }
        if (options.refTargetFactory) {
            this.setContext(CTX_TARGET_REF_FACTORY, options.refTargetFactory);
        }
        if (options.serviceTokenFactory) {
            this.setContext(CTX_SERVICE_TOKEN_FACTORY, options.serviceTokenFactory);
        }
    }

}
