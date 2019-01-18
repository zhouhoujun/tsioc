import { RunnableConfigure } from './AppConfigure';
import { IContainer, Abstract } from '@ts-ioc/core';
import { IRunnableBuilder } from './IRunnableBuilder';

/**
 * configure register.
 *
 * @export
 * @interface IConfigureRegister
 * @template T
 */
export interface IConfigureRegister<T extends RunnableConfigure> {
    /**
     * register config setting.
     *
     * @param {T} config
     * @param {IContainer} container
     * @param {IRunnableBuilder<any>} [runBuilder]
     * @returns {Promise<void>}
     * @memberof IConfigureRegister
     */
    register(config: T, container: IContainer, runBuilder?: IRunnableBuilder<any>): Promise<void>;
}

/**
 * configure register.
 *
 * @export
 * @abstract
 * @class ConfigureRegister
 * @implements {IConfigureRegister<T>}
 * @template T
 */
@Abstract()
export abstract class ConfigureRegister<T extends RunnableConfigure> implements IConfigureRegister<T> {

    constructor() {
    }

    /**
     * register config setting.
     *
     * @abstract
     * @param {T} config
     * @param {IContainer} container
     * @param {IRunnableBuilder<any>} [runBuilder]
     * @returns {Promise<void>}
     * @memberof ConfigureRegister
     */
    abstract register(config: T, container: IContainer, runBuilder?: IRunnableBuilder<any>): Promise<void>;
}
