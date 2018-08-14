import { AppConfigure } from './AppConfigure';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService {
    /**
     * start boot.
     */
    start(): Promise<any> | void;
    /**
     * stop boot.
     *
     * @returns {(Promise<any> | void)}
     * @memberof IBoot
     */
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
