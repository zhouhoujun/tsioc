import { IHandleContext } from '../handles/Handle';


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

}
