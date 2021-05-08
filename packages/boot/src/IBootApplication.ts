import { IContainer, Destroyable, IInjector, Type } from '@tsdi/ioc';
import { ApplicationContext, ApplicationOption, BootOption } from './Context';


/**
 * boot application interface.
 *
 * @export
 * @interface IBootApplication
 * @extends {ContextInit<T>}
 * @template T
 */
export interface IBootApplication<T = any> extends Destroyable {

    /**
     * boot target.
     *
     * @type {(Type<T> | ApplicationOption<T>)}
     */
    target?: Type<T> | ApplicationOption<T>;

    /**
     * get boot application context.
     *
     * @returns {T}
     */
    getContext(): ApplicationContext<T>;

    /**
     * run application
     *
     * @returns {Promise<T>}
     */
    run(): Promise<ApplicationContext<T>>;

    /**
     * get container of application.
     *
     * @returns {IContainerPool}
     */
    getContainer(): IContainer;

    /**
     * get root injector.
     */
    getRootInjector(): IInjector;

    /**
     * bootstrap.
     * @param target 
     */
    bootstrap<T>(target: Type<T> | BootOption<T>): Promise<any>;

}
