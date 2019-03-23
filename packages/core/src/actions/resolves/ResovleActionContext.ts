import {
    ProviderTypes, IocActionContext, ActionContextOption, IIocContainer
} from '@ts-ioc/ioc';


/**
 * resovle action option.
 *
 * @export
 * @interface ResovleActionOption
 */
export interface ResovleActionOption extends ActionContextOption {
    /**
     * resolver providers.
     *
     * @type {ParamProviders[]}
     * @memberof IResovleContext
     */
    providers?: ProviderTypes[];
    /**
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResovleContext
     */
    instance?: any;
}

/**
 * reslv
 *
 * @export
 * @interface IResovlerContext
 */
export class ResovleActionContext extends IocActionContext {

    /**
     * resolver providers.
     *
     * @type {ParamProviders[]}
     * @memberof IResovleContext
     */
    providers: ProviderTypes[];
    /**
     * reslove result instance.
     *
     * @type {*}
     * @memberof IResovleContext
     */
    instance?: any;


    /**
     * set resolve target.
     *
     * @param {Token<any>} token
     * @param {ProviderTypes[]} [providers]
     * @memberof ResovleContext
     */
    setOptions(options: ResovleActionOption) {
        super.setOptions(options);
    }

    /**
     * create resolve context via options.
     *
     * @static
     * @param {ResovleActionOption} [options]
     * @param {(IIocContainer | (() => IIocContainer))} [raiseContainer]
     * @returns {ResovleActionContext}
     * @memberof ResovleActionContext
     */
    static parse(options?: ResovleActionOption, raiseContainer?: IIocContainer | (() => IIocContainer)): ResovleActionContext {
        let ctx = new ResovleActionContext(raiseContainer);
        ctx.setOptions(options);
        return ctx;
    }
}
