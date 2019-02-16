import { IService, IRunner, Service, RunnableOptions } from '../runnable';
import { RunOptions } from './IRunnableBuilder';

/**
 * boot interface.
 *
 * @export
 * @interface IBoot
 * @extends {IService<T>}
 * @extends {IRunner<T>}
 * @template T
 */
export interface IBoot<T> extends IService<T>, IRunner<T> {

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

    /**
     * run boot.
     *
     * @abstract
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Boot
     */
    run(data?: any): Promise<any> {
        return this.start(data);
    }
}
