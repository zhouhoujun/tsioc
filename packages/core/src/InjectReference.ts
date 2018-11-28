
import { Registration } from './Registration';
import { Token } from './types';
import { isFunction, getClassName } from './utils';

/**
 * Reference registration.
 *
 * @export
 * @class RefRegistration
 * @extends {Registration<T>}
 * @template T
 */
export class RefRegistration<T> extends Registration<T> {
    constructor(provideType: Token<T> | Token<any>, desc: string) {
        super(provideType, desc);
        this.type = 'Ref';
    }
}

/**
 * inject reference.
 *
 * @export
 * @class InjectReference
 * @extends {Registration<T>}
 * @template T
 */
export class InjectReference<T> extends RefRegistration<T> {
    constructor(provideType: Token<T>, private target: Token<any>) {
        super(provideType, '');
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
        return `${key} for ${name}`;
    }
}

export interface IClassProvides {
    decors: string[];
    provides: Token<any>[];
}
/**
 * inject class provides token.
 *
 * @export
 * @class InjectClassProvidesToken
 * @extends {RefRegistration<IClassProvides>}
 */
export class InjectClassProvidesToken extends RefRegistration<IClassProvides> {
    constructor(provideType: Token<any>) {
        super(provideType, 'class_provides')
    }
}
