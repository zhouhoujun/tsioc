import { ResovleActionContext, Token, ResovleActionOption, IResolverContainer, Type, ClassType, ProviderMap } from '@ts-ioc/ioc';
import { TargetRef } from '../TargetService';
import { IContainer } from '../IContainer';

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
     * curr token.
     *
     * @type {Token<any>}
     * @memberof ServiceActionOption
     */
    currToken?: Token<any>;

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
     * @type {Token<any>}
     * @memberof ServiceActionOption
     */
    defaultToken?: Token<any>;

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
export class ResolveServiceContext extends ResovleActionContext implements ServiceActionOption {

    /**
     * create service resolve context.
     *
     * @static
     * @param {ServiceActionOption} [options]
     * @returns {ResolveServiceContext}
     * @memberof ResolveServiceContext
     */
    static create(options?: ServiceActionOption, raiseContainerGetter?: () => IContainer, containerGetter?: () => IResolverContainer): ResolveServiceContext {
        let ctx = new ResolveServiceContext();
        if (options) {
            Object.assign(ctx, options);
        }
        if (raiseContainerGetter || containerGetter) {
            ctx.setContext(raiseContainerGetter, containerGetter);
        }
        return ctx;
    }

    /**
     * set options.
     *
     * @param {ServiceActionOption} options
     * @memberof ResolveServiceContext
     */
    setOptions(options: ServiceActionOption) {
        super.setOptions(options);
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
