import { Registration, Token } from '@ts-ioc/core';
import { ModuleConfigure } from './ModuleConfigure';

/**
 * application runer.
 *
 * @export
 * @interface IRunner
 * @template T
 */
export interface IRunner<T> {
    token?: Token<T>;
    instance?: T;
    config?: ModuleConfigure;
    run(app: T): Promise<any>;
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
        super(type as any, 'boot__runner');
    }
}
