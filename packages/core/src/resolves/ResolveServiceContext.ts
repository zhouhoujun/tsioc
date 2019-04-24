import { Token, ResolveActionContext, ResolveActionOption, IIocContainer, createResolveContext, ClassType } from '@tsdi/ioc';
import { TargetRef } from '../TargetService';
/**
 * service action option.
 *
 * @export
 * @interface ServiceActionOption
 * @extends {ResovleActionOption}
 */
export interface ServiceActionOption<T> extends ResolveActionOption<T> {
    /**
     * token provider service type.
     *
     * @type {Type<any>}
     * @memberof ServiceActionOption
     */
    tokens?: Token<T>[];

    /**
     * curr token.
     *
     * @type {Token<any>}
     * @memberof ServiceActionOption
     */
    currToken?: Token<T>;

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ServiceActionOption
     */
    target?: any;


    targetRefs?: TargetRef[];

    /**
     * current target ref.
     *
     * @type {TargetRef}
     * @memberof ServiceActionOption
     */
    currTargetRef?: TargetRef;

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
    refTargetFactory?: (targetToken: Token<any>, token?: Token<any>) => Token<any> | Token<any>[];

    /**
     * service token factory.
     *
     * @memberof ResolveServiceContext
     */
    serviceTokenFactory?: (token: Token<any>) => Token<any>[];
}

/**
 * service resolve context.
 *
 * @export
 * @class ResolveServiceContext
 * @extends {ResovleActionContext}
 */
export class ResolveServiceContext<T> extends ResolveActionContext<T> {

    /**
     * create resolve context via options.
     *
     * @static
     * @param {ResolveActionOption} [options]
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {ResolveActionContext}
     * @memberof ResolveActionContext
     */
    static parse<T>(target?: Token<T> | ServiceActionOption<T>, raiseContainer?: IIocContainer | (() => IIocContainer)): ResolveServiceContext<T> {
        return createResolveContext<T, ResolveServiceContext<T>>(ResolveServiceContext, target, raiseContainer);
    }

    /**
     * curr token.
     *
     * @type {Token<any>}
     * @memberof ServiceActionOption
     */
    currToken?: Token<any>;

    /**
     * service tokens.
     *
     * @type {Type<any>}
     * @memberof ResolveServiceContext
     */
    tokens: Token<any>[];

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ResolveServiceContext
     */
    target?: any;

    /**
     * target reference services.
     *
     * @type {TargetRef[]}
     * @memberof ResolveServiceContext
     */
    targetRefs?: TargetRef[];

    /**
     * current target ref.
     *
     * @type {TargetRef}
     * @memberof ServiceActionOption
     */
    currTargetRef?: TargetRef;


    currTargetToken?: Token<any>;

    currTargetType?: ClassType<any>;
    /**
     * ref target factory.
     *
     * @memberof ResolveServiceContext
     */
    refTargetFactory?: (targetToken: Token<any>, token?: Token<any>) => Token<any> | Token<any>[];

    /**
     * service token factory.
     *
     * @memberof ResolveServiceContext
     */
    serviceTokenFactory?: (token: Token<any>) => Token<any>[];

    /**
     * reolve this defualt service, if not found any service.
     *
     * @type {Token<any>}
     * @memberof ResolveServiceContext
     */
    defaultToken?: Token<any>;

}
