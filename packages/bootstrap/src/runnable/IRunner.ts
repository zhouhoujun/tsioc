import { Registration, Token } from '@ts-ioc/core';
import { ModuleConfigure } from '../modules';

/**
 * application runer.
 *
 * @export
 * @interface IRunner
 * @template T
 */
export interface IRunner<T> {
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
     * run application via boot instance.
     *
     * @param {T} [app]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    run(app?: T): Promise<any>;
}

/**
 * boot element.
 *
 * @export
 * @abstract
 * @class Boot
 * @implements {IBoot}
 */
export abstract class Boot implements IRunner<any> {
    /**
     * boot run
     *
     * @abstract
     * @returns {Promise<any>}
     * @memberof Boot
     */
    abstract run(app?: any): Promise<any>;
}


/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<IRunner<T>>}
 * @template T
 */
export class InjectRunnerToken<T> extends Registration<IRunner<T>> {
    constructor(type: Token<T>) {
        super(type, 'boot__runner');
    }
}


/**
 * default runner token.
 */
export const DefaultRunnerToken = new InjectRunnerToken<any>('default');
