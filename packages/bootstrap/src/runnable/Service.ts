import { isFunction } from '@ts-ioc/ioc';
import { IRunnable, Runnable, RunnableOptions } from './Runnable';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService<T> extends IRunnable<T> {
    /**
     * start application service.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    start(data?: any): Promise<any>;
    /**
     * stop server.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    stop?(): Promise<any>;
}


/**
 * base service.
 *
 * @export
 * @abstract
 * @class Service
 * @implements {IService}
 */
export abstract class Service<T> extends Runnable<T> implements IService<T> {

    constructor(options?: RunnableOptions<T>) {
        super(options);
    }

    /**
     * start service.
     *
     * @abstract
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract start(data?: any): Promise<any>;
    /**
     * stop service.
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract stop(): Promise<any>;
}

/**
 * target is service or not.
 *
 * @export
 * @param {*} target
 * @returns {target is IService<any>}
 */
export function isService(target: any): target is IService<any> {
    if (target instanceof Service) {
        return true;
    }
    if (target && isFunction(target.start)) {
        return true;
    }
    return false;
}
