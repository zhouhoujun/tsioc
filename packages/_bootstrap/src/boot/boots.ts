import { IService, Service, RunnableOptions } from '../runnable';
import { RunOptions } from './IRunnableBuilder';
import { Abstract } from '@ts-ioc/ioc';

/**
 * boot interface.
 *
 * @export
 * @interface IBoot
 * @extends {IService<T>}
 * @extends {IRunner<T>}
 * @template T
 */
export interface IBoot<T> extends IService<T> {

    /**
     * on boot init.
     *
     * @param {RunnableOptions<T>} options
     * @param {RunOptions<T>} bootOptions
     * @returns {Promise<void>}
     * @memberof IBoot
     */
    onInit(options: RunnableOptions<T>, bootOptions: RunOptions<T>): Promise<void>;
}


/**
 * boot
 *
 * @export
 * @abstract
 * @class Boot
 * @extends {Service<T>}
 * @implements {IBoot<T>}
 * @template T
 */
@Abstract()
export abstract class Boot<T> extends Service<T> implements IBoot<T> {

    /**
     * on boot init.
     *
     * @param {RunnableOptions<T>} options
     * @param {RunOptions<T>} bootOptions
     * @returns {Promise<void>}
     * @memberof IBoot
     */
    async onInit(options: RunnableOptions<T>, bootOptions: RunOptions<T>): Promise<void> {
        await super.onInit(options, bootOptions);
    }
}
