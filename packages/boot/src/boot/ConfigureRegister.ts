import { RunnableConfigure } from './AppConfigure';
import { IContainer, ContainerToken } from '@ts-ioc/core';
import { IRunnableBuilder } from './IRunnableBuilder';
import { Abstract, Inject } from '@ts-ioc/ioc';

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
     * @param {IRunnableBuilder<any>} [runBuilder]
     * @returns {Promise<void>}
     * @memberof IConfigureRegister
     */
    register(config: T, runBuilder?: IRunnableBuilder<any>): Promise<void>;
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

    @Inject(ContainerToken)
    protected container: IContainer;

    /**
     * register config setting.
     *
     * @abstract
     * @param {T} config
     * @param {IRunnableBuilder<any>} [runBuilder]
     * @returns {Promise<void>}
     * @memberof ConfigureRegister
     */
    abstract register(config: T, runBuilder?: IRunnableBuilder<any>): Promise<void>;
}
