import { ProviderTypes } from '../providers';
import { IResolver } from '../IResolver';
import { IocActionContext, ActionContextOption } from './Action';


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
export class ResovleActionContext extends IocActionContext implements IResolver {

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
     * @returns {ResovleActionContext}
     * @memberof ResovleActionContext
     */
    static create(options?: ResovleActionOption): ResovleActionContext {
        let ctx = new ResovleActionContext();
        if (options) {
            ctx.setOptions(options);
        }
        return ctx;
    }
}
