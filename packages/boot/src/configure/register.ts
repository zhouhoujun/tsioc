import { Abstract } from '@tsdi/ioc';
import { Configure } from './config';
import { ApplicationContext } from '../Context';

/**
 * configure register.
 *
 * @export
 * @interface IConfigureRegister
 * @template T
 */
export interface IConfigureRegister<T extends ApplicationContext = ApplicationContext> {
    /**
     * register config setting.
     *
     * @param {Configure} config
     * @param {T} [ctx]
     * @returns {Promise<void>}
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
export abstract class ConfigureRegister<T extends ApplicationContext = ApplicationContext> implements IConfigureRegister<T> {

    /**
     * register config setting.
     *
     * @abstract
     * @param {Configure} config
     * @param {T} [ctx]
     * @returns {Promise<void>}
     */
    abstract register(config: Configure, ctx?: T): Promise<void>;
}
