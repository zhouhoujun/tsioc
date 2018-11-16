
import { Registration } from './Registration';
import { Token } from './types';
import { isFunction, getClassName } from './utils';

/**
 * inject reference.
 *
 * @export
 * @class InjectReference
 * @extends {Registration<T>}
 * @template T
 */
export class InjectReference<T> extends Registration<T> {
    constructor(provideType: Token<T>, private target: Token<any>) {
        super(provideType, '_ref_');
    }

    /**
     * to string.
     *
     * @returns {string}
     * @memberof Registration
     */
    toString(): string {
        let key = super.toString();
        let name = '';
        if (isFunction(this.target)) {
            name = `{${getClassName(this.target)}}`;
        } else if (this.target) {
            name = this.target.toString();
        }
        return `${key}${name}`;
    }
}
