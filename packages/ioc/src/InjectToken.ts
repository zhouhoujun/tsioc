import { Registration } from './Registration';
import { TokenId } from './types';

/**
 * inject token.
 *
 * @export
 * @class InjectToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectToken<T> extends Registration<T> {
    constructor(desc: string | symbol) {
        super(desc, '');
    }
}

/**
 * parse id string to token id.
 * @param key id
 */
export function tokenId<T>(key: string): TokenId<T> {
    return key;
}
