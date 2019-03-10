import { ResovleContext, Type, ClassType, Token } from '@ts-ioc/ioc';


/**
 * service resolve context.
 *
 * @export
 * @class ServiceResolveContext
 * @extends {ResovleContext}
 */
export class ServiceResolveContext extends ResovleContext {
    /**
     * token provider service type.
     *
     * @type {Type<any>}
     * @memberof ServiceResolveContext
     */
    tokenType: Type<any>;

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ServiceResolveContext
     */
    target?: any;

    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof ServiceResolveContext
     */
    targetType?: ClassType<any>;

    /**
     * reolve this defualt service, if not found any service.
     *
     * @type {Token<any>}
     * @memberof ServiceResolveContext
     */
    defaultToken?: Token<any>;

    /**
     * get all service type of token.
     *
     * @type {boolean}
     * @memberof ServiceResolveContext
     */
    all?: boolean;

    both?: boolean;


    refFactory?: (token: Token<any>) => Token<any> | Token<any>[]
    /**
     * set ref token factory.
     *
     * @param {((token: Token<any>) => Token<any> | Token<any>[])} refFactory
     * @memberof ServiceResolveContext
     */
    setRefTokenFactory(refFactory: (token: Token<any>) => Token<any> | Token<any>[]) {
        this.refFactory = refFactory;
    }

}
