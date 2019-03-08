import { ResovleContext, Type } from '@ts-ioc/ioc';


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
    targetType?: Type<any>;

    /**
     * get all service type of token.
     *
     * @type {boolean}
     * @memberof ServiceResolveContext
     */
    all?: boolean;

    both?: boolean;


    private?: boolean;

}
