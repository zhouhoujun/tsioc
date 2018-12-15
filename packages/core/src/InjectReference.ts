import { Registration } from './Registration';
import { Token } from './types';

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
export class InjectReference<T> extends Registration<T> {
    constructor(provideType: Token<T>, private target: Token<any>) {
        super(provideType, '');
    }

    protected init(provideType: Token<T>) {
        this.classType = this.format(provideType);
    }

    /**
     * to string.
     *
     * @returns {string}
     * @memberof Registration
     */
    toString(): string {
        let key = super.toString();
        let target = this.format(this.target)
        return `Ref ${key} for ${target}`;
    }
}

/**
 * class provides.
 *
 * @export
 * @interface IClassProvides
 */
export interface IClassProvides {
    /**
     * decorators of class
     *
     * @type {string[]}
     * @memberof IClassProvides
     */
    decors: string[];
    /**
     * provides of class
     *
     * @type {Token<any>[]}
     * @memberof IClassProvides
     */
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
