import { IContainer } from '../IContainer';
import { Token, Type } from '../types';
import { Container } from '../Container';
import { IResolver } from '../IResolver';

/**
 * exports interface.
 *
 * @export
 * @interface IExports
 */
export interface IExports extends IResolver {
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
     * @type {Token<any>[]}
     * @memberof IExports
     */
    exports?: Token<any>[];

    /**
     * ioc container, the module defined in.
     *
     * @type {IContainer}
     * @memberof IExports
     */
    container?: IContainer;
}

/**
 *  resolver type.
 */
export type ResolverType = Container | IExports;
