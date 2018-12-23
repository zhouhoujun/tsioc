import { Type, AbstractType, Token, SymbolType } from './types';
import { isClass, isFunction, getClassName, isAbstractClass } from './utils';


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
        this.init(provideType, desc);
    }

    protected init(provideType: Token<T> | Token<any>, desc?: string) {
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

    /**
     * get provide.
     *
     * @returns {SymbolType<any>}
     * @memberof Registration
     */
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
        if (isClass(this.classType) || isAbstractClass(this.classType)) {
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
        return this.format(this);
    }

    protected format(reg: Token<T>): string {
        if (reg instanceof Registration) {
            let name = '';
            if (isClass(reg.classType) || isAbstractClass(reg.classType)) {
                name = `{${getClassName(reg.classType)}}`;
            } else if (isFunction(reg.classType)) {
                name = reg.classType.name;
            } else if (reg.classType) {
                name = reg.classType.toString();
            }
            return [reg.type, name, reg.desc].filter(n => n).join('_');
        } else if (isClass(reg) || isAbstractClass(reg)) {
            return `{${getClassName(reg)}}`;
        } else if (isFunction(reg)) {
            return reg.name;
        } else if (reg) {
            return reg.toString();
        }
        return '';
    }
}
