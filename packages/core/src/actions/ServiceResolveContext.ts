import { ResovleActionContext, Type, ClassType, Token, ResovleActionOption } from '@ts-ioc/ioc';

/**
 * service action option.
 *
 * @export
 * @interface ServiceActionOption
 * @extends {ResovleActionOption}
 */
export interface ServiceActionOption extends ResovleActionOption {
    /**
     * token provider service type.
     *
     * @type {Type<any>}
     * @memberof ServiceResolveContext
     */
    tokenType?: Type<any>;

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

    /**
     * ref service token factory.
     *
     * @memberof ServiceActionOption
     */
    refFactory?: (token: Token<any>) => Token<any> | Token<any>[];
}

/**
 * service resolve context.
 *
 * @export
 * @class ServiceResolveContext
 * @extends {ResovleActionContext}
 */
export class ServiceResolveContext extends ResovleActionContext {

    /**
     * create service resolve context.
     *
     * @static
     * @param {ServiceActionOption} [options]
     * @returns {ServiceResolveContext}
     * @memberof ServiceResolveContext
     */
    static create(options?: ServiceActionOption): ServiceResolveContext {
        let ctx = new ServiceResolveContext();
        if (options) {
            Object.assign(ctx, options);
        }
        return ctx;
    }

    /**
     * set options.
     *
     * @param {ServiceActionOption} options
     * @memberof ServiceResolveContext
     */
    setOptions(options: ServiceActionOption) {
        super.setOptions(options);
    }

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

    refFactory?: (token: Token<any>) => Token<any> | Token<any>[];

}
