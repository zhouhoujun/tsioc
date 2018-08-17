import { Token, Registration } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';

/**
 * IService interface
 *
 * @export
 * @interface IService
 */
export interface IService<T> {
    /**
     * module boot token.
     */
    token?: Token<T>;
    /**
     * module boot instance.
     *
     * @type {T}
     * @memberof IService
     */
    instance?: T;
    /**
     * module configure.
     *
     * @type {ModuleConfigure}
     * @memberof IService
     */
    config?: ModuleConfigure;

    /**
     * start application service.
     *
     * @returns {Promise<any>}
     * @memberof IService
     */
    start(): Promise<any>;
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
export abstract class Service implements IService<any> {
    /**
     * start service.
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Service
     */
    abstract start(): Promise<any>;
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
