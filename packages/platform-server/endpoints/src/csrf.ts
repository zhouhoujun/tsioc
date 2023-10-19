import { CsrfOptions, CsrfTokensFactory } from '@tsdi/endpoints/assets';
import * as Tokens from 'csrf';

/**
 * csrf token factory for nodejs.
 */
export class NodeCsrfTokensFactory extends CsrfTokensFactory {
    create(options: CsrfOptions): Tokens {
        return new Tokens(options);
    }
}
