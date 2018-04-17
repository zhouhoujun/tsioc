import { Type, AbstractType } from './types';
import { isClass, isFunction, getClassName } from './utils/index';

/**
 * inject token.
 * @export
 * @class Registration
 * @template T
 */
export class Registration<T> {

    protected type = 'Registration';
    /**
     * Creates an instance of Registration.
     * @param {Type<T> | AbstractType<T>} classType
     * @param {string} desc
     * @memberof Registration
     */
    constructor(protected classType: Type<T> | AbstractType<T> | symbol | string, protected desc: string) {
    }


    /**
     * get class.
     *
     * @returns
     * @memberof Registration
     */
    getClass(): Type<T> | AbstractType<T> {
        if (isClass(this.classType)) {
            return this.classType;
        }
        return null;
    }

    /**
     * get desc.
     *
     * @returns
     * @memberof Registration
     */
    getDesc() {
        return this.desc;
    }

    /**
     * to string.
     *
     * @returns {string}
     * @memberof Registration
     */
    toString(): string {
        let name = '';
        if (isFunction(this.classType)) {
            name = getClassName(this.classType);
        } else {
            name = this.classType.toString();
        }
        return `${this.type} ${name} ${this.desc}`;
    }
}
