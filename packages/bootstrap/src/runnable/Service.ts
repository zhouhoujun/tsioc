import { Token, isFunction } from '@ts-ioc/core';
import { ModuleConfigure } from '../modules';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService<T> {
    /**
     * target instance.
     *
     * @type {T}
     * @memberof IRunner
     */
    getTarget?(): T;
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
export abstract class Service<T> implements IService<T> {

    constructor(protected token?: Token<T>, protected instance?: T, protected config?: ModuleConfigure) {

    }

    /**
     * get target.
     *
     * @returns {T}
     * @memberof Service
     */
    getTarget(): T {
        return this.instance;
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
