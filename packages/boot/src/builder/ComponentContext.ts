import { IHandleContext } from '../handles/Handle';
import { ModuleConfigure } from '../modules/ModuleConfigure';


/**
 * component context.
 *
 * @export
 * @interface IComponentContext
 * @extends {IHandleContext}
 */
export interface IComponentContext extends IHandleContext {

    /**
     * template.
     *
     * @type {*}
     * @memberof IComponentContext
     */
    template?: any;

    /**
     * decoractor.
     *
     * @type {string}
     * @memberof IComponentContext
     */
    decorator?: string;

    /**
     * annoation metadata config.
     *
     * @type {ModuleConfigure}
     * @memberof BuildContext
     */
    annoation?: ModuleConfigure;
}
