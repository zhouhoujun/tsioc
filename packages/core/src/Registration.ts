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
    protected classType: Type<T> | AbstractType<T> | symbol | string;
    protected desc: string;
    /**
     * Creates an instance of Registration.
     * @param {(provideType: Type<T> | AbstractType<T> | symbol | string | Registration<T>)} provideType
     * @param {string} desc
     * @memberof Registration
     */
    constructor(provideType: Type<T> | AbstractType<T> | symbol | string | Registration<T>, desc: string) {
        if (provideType instanceof Registration) {
            this.classType = provideType.classType;
            let pdec = provideType.getDesc();
            if (pdec && desc && pdec !== desc) {
                this.desc = pdec + '_' + desc;
            } else {
                this.desc = desc;
            }
        } else {
            this.classType = provideType;
            this.desc = desc;
        }
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
        } else if (this.classType) {
            name = this.classType.toString();
        }
        return `${this.type} ${name} ${this.desc}`;
    }
}
