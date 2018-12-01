import { Type, AbstractType, Token, SymbolType } from './types';
import { isClass, isFunction, getClassName } from './utils';


/**
 * is registration class or not.
 *
 * @export
 * @param {*} target
 * @returns
 */
export function isRegistrationClass(target: any): target is Type<Registration<any>> {
    if (isClass(target)) {
        return (<any>target).isIocRegClass === true;
    }
    return false;
}

/**
 * inject token.
 * @export
 * @class Registration
 * @template T
 */
export class Registration<T> {
    static readonly isIocRegClass = true;
    protected type = '';
    protected classType: SymbolType<any>;
    protected desc: string;
    /**
     * Creates an instance of Registration.
     * @param {(Token<T> | Token<any>)} provideType
     * @param {string} desc
     * @memberof Registration
     */
    constructor(provideType: Token<T> | Token<any>, desc: string) {
        if (provideType instanceof Registration) {
            if (desc) {
                this.classType = provideType.toString();
                this.desc = desc;
            } else {
                this.classType = provideType.getProvide();
                this.desc = provideType.getDesc();
            }
        } else {
            this.classType = provideType;
            this.desc = desc;
        }
    }

    getProvide(): SymbolType<any> {
        return this.classType;
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
            name = `{${getClassName(this.classType)}}`;
        } else if (this.classType) {
            name = this.classType.toString();
        }
        return [this.type, name, this.desc].filter(n => n).join('_');
    }
}
