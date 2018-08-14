import { AppConfigure } from './AppConfigure';

/**
 * service interface
 *
 * @export
 * @interface IService
 */
export interface IService {
    start(): Promise<any> | void;
    stop(): Promise<any> | void;
}

/**
 * applicaton
 *
 * @export
 * @interface IApplication
 */
export interface IApplication extends IService {
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
