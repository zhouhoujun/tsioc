import { Token } from '../types';
import { ProviderTypes } from '../providers';
import { IResolver } from '../IResolver';
import { IocActionContext } from './Action';

/**
 * reslv
 *
 * @export
 * @interface IResovlerContext
 */
export class ResovleContext extends IocActionContext implements IResolver {

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
     * token.
     *
     * @type {Token<any>}
     * @memberof ResovleContext
     */
    token: Token<any>;


    /**
     * set resolve target.
     *
     * @param {Token<any>} token
     * @param {ProviderTypes[]} [providers]
     * @memberof ResovleContext
     */
    setResolveTarget(token: Token<any>, providers?: ProviderTypes[]) {
        this.token = token;
        this.providers = providers || [];
    }

}
