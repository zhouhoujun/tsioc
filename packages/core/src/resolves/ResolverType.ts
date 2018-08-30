import { IContainer } from '../IContainer';
import { Token, Type } from '../types';
import { Container } from '../Container';

/**
 * exports interface.
 *
 * @export
 * @interface IExports
 */
export interface IExports {
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
     * exports providers
     *
     * @type {Token<any>[]}
     * @memberof IExports
     */
    providers?: Token<any>[];

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
