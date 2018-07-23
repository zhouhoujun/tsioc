import { AppConfiguration } from './AppConfiguration';
import { Registration } from '@ts-ioc/core';


/**
 * Inject ApplicationToken
 *
 * @export
 * @class InjectApplicationToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectApplicationToken<T extends IApplication> extends Registration<T> {
    constructor(desc: string) {
        super('Application', desc);
    }
}

/**
 * Application Token.
 */
export const ApplicationToken = new InjectApplicationToken<IApplication>('');


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
