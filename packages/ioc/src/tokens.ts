import { AbstractType, Type, ClassType, Modules } from './types';
import { IInjector, IProvider } from './IInjector';
import { isFunction, lang, isString, isClassType, isSymbol } from './utils/lang';
import { refInjExp } from './utils/exps';
import { StaticProvider } from './providers';


/**
 *  token interface.
 */
export interface IToken<T = any> {
    (): T;
    tokenId: true;
}


/**
 * inject token.
 * @export
 * @class Registration
 * @template T
 */
export class Registration<T = any> {
    protected type = '';
    protected classType: SymbolType;
    protected desc: string;
    /**
     * Creates an instance of Registration.
     * @param {(Token<T> | Token)} provideType
     * @param {string} desc
     * @memberof Registration
     */
    constructor(provideType: Token<T> | Token, desc: string) {
        this.init(provideType, desc);
    }

    protected init(provideType: Token<T> | Token, desc?: string) {
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
     * @returns {SymbolType}
     * @memberof Registration
     */
    getProvide(): SymbolType {
        return this.classType;
    }

    /**
     * get class.
     *
     * @returns
     * @memberof Registration
     */
    getClass(): Type<T> | AbstractType<T> {
        if (isClassType(this.classType)) {
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
            if (isFunction(reg.classType)) {
                name = `{${lang.getClassName(reg.classType)}}`;
            } else if (reg.classType) {
                name = reg.classType.toString();
            }
            return [reg.type, name, reg.desc].filter(n => n).join('_');
        } else if (isFunction(reg)) {
            return `{${lang.getClassName(reg)}}`;
        } else if (reg) {
            return reg.toString();
        }
        return '';
    }
}

/**
 * get token key.
 * @param token token.
 * @param alias alias.
 */
export function getTokenKey<T>(token: Token<T>, alias?: string): SymbolType<T> {
    if (alias) {
        return new Registration(token, alias).toString();
    } else if (token instanceof Registration) {
        return token.toString();
    }
    return token;
}


/**
 *  token id.
 */
export type TokenId<T = any> = string | symbol | IToken<T>;


/**
 * symbol type
 */
export type SymbolType<T = any> = ClassType<T> | TokenId<T>;

/**
 * factory tocken.
 */
export type Token<T = any> = Registration<T> | SymbolType<T>;


/**
 * provide token
 */
export type ProvideToken<T> = Registration<T> | TokenId<T>;

/**
 * providers.
 * note: ObjectMap provider can not resolve token.
 */
export type Provider = IProvider | StaticProvider | Modules[];

/**
 * providers types
 * @deprecated use Provider instead.
 */
export type ProviderTypes = Provider;
/**
 * providers types
 * @deprecated use Provider instead.
 */
export type ParamProviders = Provider;
/**
 * inject types
 * @deprecated use Provider instead.
 */
export type InjectTypes = Provider;

/**
 * instance factory.
 */
export type InstanceFactory<T = any> = (...providers: Provider[]) => T;


/**
 * Factory of Token
 */
export type Factory<T> = T | Type<T> | ((injector?: IInjector) => T);



/**
 * inject token.
 *
 * @export
 * @class InjectToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectToken<T = any> extends Registration<T> {
    constructor(desc: string | symbol) {
        super(desc, '');
    }
}

/**
 * parse id string to token id.
 * @param key id
 */
export function tokenId<T = any>(key: string): TokenId<T> {
    return Symbol(key);
}



/**
 * inject reference.
 *
 * @export
 * @class InjectReference
 * @extends {Registration<T>}
 * @template T
 */
export class InjectReference<T = any> extends Registration<T> {
    constructor(provideType: Token<T>, private target: Token) {
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
        let target = this.format(this.target);
        return `Ref ${key} for ${target}`;
    }
}

/**
 * is inject reference token or not.
 *
 * @export
 * @template T
 * @param {*} target
 * @returns {target is InjectReference<T>}
 */
export function isInjectReference<T>(target: any): target is InjectReference<T> {
    if (!target) {
        return false;
    }
    return target instanceof InjectReference || (isString(target) && refInjExp.test(target));
}


/**
 * check target is token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Token}
 */
export function isToken(target: any): target is Token {
    if (!target) {
        return false;
    }
    if (isProvideToken(target)) {
        return true;
    }
    return isClassType(target);
}


/**
 * check target is provide token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ProvideToken}
 */
export function isProvideToken(target: any): target is ProvideToken<any> {
    if (isFunction(target)) return false;
    return isString(target) || isSymbol(target) || target instanceof Registration;
}
