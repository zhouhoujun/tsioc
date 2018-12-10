import { Token, RefRegistration } from '@ts-ioc/core';
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
     * run application via boot instance.
     *
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof IRunner
     */
    run(data?: any): Promise<any>;
}

/**
 * boot element.
 *
 * @export
 * @abstract
 * @class Boot
 * @implements {IBoot}
 */
export abstract class Runner<T> implements IRunner<T> {

    constructor(protected token?: Token<T>, protected instance?: T, protected config?: ModuleConfigure) {

    }

    /**
     * run boot.
     *
     * @abstract
     * @param {*} [data]
     * @returns {Promise<any>}
     * @memberof Runner
     */
    abstract run(data?: any): Promise<any>;
}

/**
 * boot element
 *
 * @export
 * @class Boot
 * @extends {Runner<any>}
 */
export abstract class Boot extends Runner<any> {
    constructor(protected token?: Token<any>, protected instance?: any, protected config?: ModuleConfigure) {
        super(token, instance, config);
    }
}


/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<IRunner<T>>}
 * @template T
 */
export class InjectRunnerToken<T> extends RefRegistration<IRunner<T>> {
    constructor(type: Token<T>) {
        super(type, 'runner');
    }
}

/**
 * default runner token.
 */
export const RunnerToken = new InjectRunnerToken<any>(Object);
