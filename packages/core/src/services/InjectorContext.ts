import { IContainer } from '../IContainer';
import { Type } from '@ts-ioc/ioc';

/**
 * injector context.
 *
 * @export
 * @interface InjectorContext
 */
export interface InjectorContext {
    /**
     * the modules to injector.
     *
     * @type {Type<any>[]}
     * @memberof InjectorContext
     */
    modules: Type<any>[];
    /**
     * the container modules inject to.
     *
     * @type {IContainer}
     * @memberof InjectorContext
     */
    container: IContainer;
    /**
     * injected modules.
     *
     * @type {Type<any>[]}
     * @memberof InjectorContext
     */
    injected?: Type<any>[];
}
