import { Token, InjectReference } from '@tsdi/ioc';
import { Startup } from './Startup';


/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<Startup<T>>}
 * @template T
 */
export class InjectRunnableToken<T> extends InjectReference<Startup<T>> {
    constructor(type: Token<T>) {
        super(Startup, type);
    }
}

