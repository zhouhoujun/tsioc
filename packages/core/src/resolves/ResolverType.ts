import { IContainer } from '../IContainer';
import { Token, Type, Factory } from '../types';
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

    /**
     * iterator
     *
     * @param {(tk: Token<any>, fac: Factory<any>, resolvor?: IResolver) => void} callbackfn
     * @memberof IExports
     */
    forEach(callbackfn: (tk: Token<any>, fac: Factory<any>, resolvor?: IResolver) => void): void;
}


/**
 *  resolver type.
 */
export type ResolverType = Container | IExports;
