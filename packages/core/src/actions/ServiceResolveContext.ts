import { ResovleActionContext, Type, ClassType, Token, ResovleActionOption, lang } from '@ts-ioc/ioc';

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
     * @memberof ServiceActionOption
     */
    tokens?: Token<any>[];

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ServiceActionOption
     */
    target?: any;

    /**
     * target type.
     *
     * @type {Type<any>}
     * @memberof ServiceActionOption
     */
    targetType?: ClassType<any>;

    /**
     * reolve this defualt service, if not found any service.
     *
     * @type {Token<any>}
     * @memberof ServiceActionOption
     */
    defaultToken?: Token<any>;

    /**
     * get all service type of token.
     *
     * @type {boolean}
     * @memberof ServiceActionOption
     */
    all?: boolean;

    both?: boolean;

    /**
     * ref service token factory.
     *
     * @memberof ServiceActionOption
     */
    refTargetFactory?: (token: Token<any>) => Token<any> | Token<any>[];

    /**
     * service token factory.
     *
     * @memberof ServiceActionOption
     */
    serviceTokenFactory?: (token: Token<any>) => Token<any>[];
}

/**
 * service of target.
 *
 * @export
 * @class ServiceTarget
 */
export class TargetToken {
    constructor(protected target: any) {

    }

    getTokens(): Token<any>[] {
        return [lang.getClass(this.target)];
    }
}

/**
 * private target token.
 *
 * @export
 * @class PrivateTargetToken
 * @extends {TargetToken}
 */
export class PrivateTargetToken extends TargetToken {
    getTokens(): Token<any>[] {
        return [lang.getClass(this.target)];
    }
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
     * service tokens.
     *
     * @type {Type<any>}
     * @memberof ServiceResolveContext
     */
    tokens: Token<any>[];

    /**
     * service reference target.
     *
     * @type {*}
     * @memberof ServiceResolveContext
     */
    target?: any;

    /**
     * current target type.
     *
     * @type {Type<any>}
     * @memberof ServiceResolveContext
     */
    targetType?: ClassType<any>;

    /**
     * ref target factory.
     *
     * @memberof ServiceResolveContext
     */
    refTargetFactory?: (token: Token<any>, targetToken: Token<any>) => Token<any> | Token<any>[];

    /**
     * service token factory.
     *
     * @memberof ServiceResolveContext
     */
    serviceTokenFactory?: (token: Token<any>) => Token<any>[];

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

}
