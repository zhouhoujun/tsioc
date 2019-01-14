import { IService } from './Service';
import { IRunner } from './Runner';
import { RefRegistration, Token } from '@ts-ioc/core';
import { IRunnable } from './Runnable';

/**
 * runn able.
 */
export type Runnable<T> = IService<T> | IRunner<T> | IRunnable<T>;


/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<IRunner<T>>}
 * @template T
 */
export class InjectRunnableToken<T> extends RefRegistration<Runnable<T>> {
    constructor(type: Token<T>) {
        super(type, 'Runnable');
    }
}



/**
 * default service token.
 */
export const ServiceToken = new InjectRunnableToken<IService<any>>('service');


/**
 * default runner token.
 */
export const RunnerToken = new InjectRunnableToken<IRunner<any>>('runner');
