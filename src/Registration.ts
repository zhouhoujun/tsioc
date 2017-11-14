import { Type } from './Type';

/**
 * injecto token.
 * @export
 * @class Registration
 * @template T
 */
export class Registration<T> {
    protected type: 'Registration';
    constructor(protected classType: Type<T>, protected desc: string) {
    }

    getClass() {
        return this.classType
    }

    toString(): string {
        return `${this.type} ${typeof this.classType} ${this.desc}`;
    }
}
