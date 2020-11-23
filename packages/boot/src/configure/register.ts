import { Abstract } from '@tsdi/ioc';
import { Configure } from './Configure';
import { IBootContext } from '../Context';

/**
 * configure register.
 *
 * @export
 * @interface IConfigureRegister
 * @template T
 */
export interface IConfigureRegister<T extends IBootContext = IBootContext> {
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
export abstract class ConfigureRegister<T extends IBootContext = IBootContext> implements IConfigureRegister<T> {

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
