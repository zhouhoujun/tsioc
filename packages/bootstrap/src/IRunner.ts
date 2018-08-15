import { IApplication } from './IApplication';
import { Registration, Token } from '@ts-ioc/core';

/**
 * application runer.
 *
 * @export
 * @interface IRunner
 * @template T
 */
export interface IRunner<T extends IApplication> {
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
export class InjectRunnerToken<T extends IApplication> extends Registration<IRunner<T>> {
    constructor(type: Token<T>) {
        super(type as any, 'boot__runner');
    }
}
