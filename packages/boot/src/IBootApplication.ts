import { Destroyable } from '@tsdi/ioc';
import { ApplicationContext } from './Context';


/**
 * boot application interface.
 *
 * @export
 * @interface IBootApplication
 * @extends {ContextInit<T>}
 * @template T
 */
export interface IBootApplication extends Destroyable {

    /**
     * get boot application context.
     *
     * @returns {T}
     */
    getContext(): ApplicationContext;

    /**
     * run application
     *
     * @returns {Promise<T>}
     */
    run(): Promise<ApplicationContext>;

}
