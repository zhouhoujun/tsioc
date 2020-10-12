import { Abstract } from '@tsdi/ioc';
import { Configure } from './Configure';
import { BootContext } from '../Context';

/**
 * configure register.
 *
 * @export
 * @interface IConfigureRegister
 * @template T
 */
export interface IConfigureRegister<T extends BootContext = BootContext> {
    /**
     * register config setting.
     *
     * @param {Configure} config
     * @param {T} [ctx]
     * @returns {Promise<void>}
     * @memberof IConfigureRegister
     */
    register(config: Configure, ctx?: T): Promise<void>;
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
export abstract class ConfigureRegister<T extends BootContext = BootContext> implements IConfigureRegister<T> {

    constructor() {
    }

    /**
     * register config setting.
     *
     * @abstract
     * @param {Configure} config
     * @param {T} [ctx]
     * @returns {Promise<void>}
     * @memberof ConfigureRegister
     */
    abstract register(config: Configure, ctx?: T): Promise<void>;
}
