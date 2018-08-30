import { Token, Registration } from '@ts-ioc/core';
import { ModuleConfigure } from '../modules';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService<T> {

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
 * application service token.
 *
 * @export
 * @class InjectServiceToken
 * @extends {Registration<IService<T>>}
 * @template T
 */
export class InjectServiceToken<T> extends Registration<IService<T>> {
    constructor(type: Token<T>) {
        super(type, 'boot__service');
    }
}

/**
 * default service token.
 */
export const DefaultServiceToken = new InjectServiceToken<any>('default');
