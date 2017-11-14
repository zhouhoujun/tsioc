import { Type } from './Type';

/**
 * injecto token.
 * @export
 * @class Registration
 * @template T
 */
export class Registration<T> {
    protected type: 'Registration';
    /**
     * Creates an instance of Registration.
     * @param {Type<T>} classType
     * @param {string} desc
     * @memberof Registration
     */
    constructor(protected classType: Type<T>, protected desc: string) {
    }

    /**
     * get class.
     *
     * @returns
     * @memberof Registration
     */
    getClass() {
        return this.classType
    }

    /**
     * to string.
     *
     * @returns {string}
     * @memberof Registration
     */
    toString(): string {
        return `${this.type} ${typeof this.classType} ${this.desc}`;
    }
}
