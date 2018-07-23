import { AppConfiguration } from './AppConfiguration';

/**
 * application.
 *
 * @export
 * @interface IApplication
 */
export interface IApplication {
    /**
     * application configuration.
     *
     * @type {AppConfiguration<any>}
     * @memberof IApplication
     */
    config?: AppConfiguration<any>;
}
