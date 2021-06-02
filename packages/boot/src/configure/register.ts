import { Abstract } from '@tsdi/ioc';
import { Configuration } from './config';
import { ApplicationContext } from '../Context';

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
     * @param {Configuration} config
     * @param {ApplicationContext} [ctx]
     * @returns {Promise<void>}
     */
    register(config: Configuration, ctx?: ApplicationContext): Promise<void>;
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

    /**
     * register config setting.
     *
     * @abstract
     * @param {Configuration} config
     * @param {ApplicationContext} [ctx]
     * @returns {Promise<void>}
     */
    abstract register(config: Configuration, ctx?: ApplicationContext): Promise<void>;
}
