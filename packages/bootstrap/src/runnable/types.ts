import { Token, InjectReference } from '@ts-ioc/ioc';
import { Runnable } from './Runnable';


/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<Runnable<T>>}
 * @template T
 */
export class InjectRunnableToken<T> extends InjectReference<Runnable<T>> {
    constructor(type: Token<T>) {
        super(Runnable, type);
    }
}

