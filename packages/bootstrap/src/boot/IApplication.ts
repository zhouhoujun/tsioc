import { AppConfigure } from './AppConfigure';
import { IService } from '../runnable';


/**
 * applicaton
 *
 * @export
 * @interface IApplication
 */
export interface IApplication<T> extends IService<T> {
    /**
     * application name
     *
     * @type {string}
     * @memberof IApplication
     */
    name?: string;
    /**
     * application configuration.
     *
     * @type {AppConfigure}
     * @memberof IApplication
     */
    config?: AppConfigure;
}
