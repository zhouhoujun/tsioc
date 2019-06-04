import { Token, ResolveActionContext, ResolveActionOption, IIocContainer, createResolveContext, ClassType } from '@tsdi/ioc';
import { TargetRef } from '../TargetService';


export type TargetRefType =  Object | TargetRef;

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
     * @type {Type<any>}
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
    static parse<T>(target?: Token<T> | ServiceOption<T>, raiseContainer?: IIocContainer | (() => IIocContainer)): ResolveServiceContext<T> {
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
     * get extend servie or not.
     *
     * @type {boolean}
     * @memberof ServiceOption
     */
    extend?: boolean;

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

    currDecorator?: string;

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
