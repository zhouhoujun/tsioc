import { IContainer } from '../IContainer';
import { Token, Type } from '../types';
import { IResolverContainer } from '../IResolver';
import { ProviderMap } from '../providers';

/**
 * exports interface.
 *
 * @export
 * @interface IExports
 */
export interface IExports extends IResolverContainer {
    /**
     * export token of type.
     *
     * @type {Token<any>}
     * @memberof IExports
     */
    token?: Token<any>;
    /**
     * exports module type.
     *
     * @type {Type<T>}
     * @memberof AnnotationConfigure
     */
    type?: Type<any>;
    /**
     * exports modules
     *
     * @type {IResolverContainer}
     * @memberof IExports
     */
    exports?: IResolverContainer;

    /**
     * ioc container, the module defined in.
     *
     * @type {IContainer}
     * @memberof IExports
     */
    container?: IContainer;
}

