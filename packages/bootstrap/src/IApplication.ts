import { AppConfiguration } from './AppConfiguration';
import { Registration, IContainer } from '@ts-ioc/core';


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
        super('DI_Application', desc);
    }
}

/**
 * Default Application Token.
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

    /**
     * ioc container.
     *
     * @memberof IApplication
     */
    container?: IContainer;
}

/**
 * on Application start.
 *
 * @export
 * @interface OnStart
 * @template T
 */
export interface OnApplicationStart<T extends IApplication> {
    /**
     * on application start.
     *
     * @param {T} instance
     * @memberof OnStart
     */
    onStart(instance: T): void | Promise<any>;
}

/**
 * on Application started.
 *
 * @export
 * @interface OnStart
 * @template T
 */
export interface OnApplicationStarted<T extends IApplication> {
    /**
     * on application onStarted.
     *
     * @param {T} instance
     * @memberof OnStart
     */
    onStarted(instance: T): void;
}
