import { Destroyable } from '@tsdi/ioc';
import { ApplicationContext } from './Context';


/**
 * application interface.
 *
 * @export
 * @interface IApplication
 * @extends {ContextInit<T>}
 * @template T
 */
export interface IApplication extends Destroyable {

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
