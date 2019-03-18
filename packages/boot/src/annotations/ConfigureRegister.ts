import { RunnableConfigure } from './RunnableConfigure';
import { IContainer, ContainerToken } from '@ts-ioc/core';
import { Abstract, Inject } from '@ts-ioc/ioc';
import { BootContext } from '../BootContext';

/**
 * configure register.
 *
 * @export
 * @interface IConfigureRegister
 * @template T
 */
export interface IConfigureRegister {
    /**
     * register config setting.
     *
     * @param {RunnableConfigure} config
     * @param {BootContext} [ctx]
     * @returns {Promise<void>}
     * @memberof IConfigureRegister
     */
    register(config: RunnableConfigure, ctx?: BootContext): Promise<void>;
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
export abstract class ConfigureRegister implements IConfigureRegister {

    constructor() {
    }

    @Inject(ContainerToken)
    protected container: IContainer;

    /**
     * register config setting.
     *
     * @abstract
     * @param {RunnableConfigure} config
     * @param {BootContext} [ctx]
     * @returns {Promise<void>}
     * @memberof ConfigureRegister
     */
    abstract register(config: RunnableConfigure, ctx?: BootContext): Promise<void>;
}
