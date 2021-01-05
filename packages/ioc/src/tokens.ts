import { AbstractType, Type, ClassType, Modules } from './types';
import { IProvider } from './IInjector';
import { isFunction, isString, isClassType, isSymbol, isNil } from './utils/chk';
import { refInjExp } from './utils/exps';
import { StaticProvider } from './providers';
import { getClassName } from './utils/lang';


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
    private formated: string;
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
     */
    getProvide(): SymbolType {
        return this.classType;
    }

    /**
     * get class.
     *
     * @returns
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
     */
    getDesc() {
        return this.desc;
    }

    /**
     * to string.
     *
     * @returns {string}
     */
    toString(): string {
        if (!this.formated) {
            this.formated = this.formatting();
        }
        return this.formated;
    }

    /**
     * frmatting this.
     */
    protected formatting() {
        return this.format(this);
    }

    protected format(reg: Token<T>): string {
        if (reg instanceof Registration) {
            let name = '';
            if (isFunction(reg.classType)) {
                name = `{${getClassName(reg.classType)}}`;
            } else if (reg.classType) {
                name = reg.classType.toString();
            }
            return [reg.type, name, reg.desc].filter(n => n).join('_');
        } else if (isFunction(reg)) {
            return `{${getClassName(reg)}}`;
        } else if (reg) {
            return reg.toString();
        }
        return '';
    }
}

/**
* get token.
*
* @template T
* @param {Token<T>} token
* @param {string} [alias]
* @returns {Token<T>}
*/
export function getToken<T>(token: Token<T>, alias?: string): Token<T> {
   if (alias) {
       return new Registration(token, alias);
   }
   return token;
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
 */
export type ProviderType = IProvider | StaticProvider | Modules[];

/**
 * providers types
 * @deprecated use `ProviderType` instead.
 */
export type ProviderTypes = ProviderType;
/**
 * providers types
 * @deprecated use `ProviderType` instead.
 */
export type ParamProviders = ProviderType;
/**
 * inject types
 * @deprecated use `ProviderType` instead.
 */
export type InjectTypes = ProviderType;

/**
 * instance factory.
 */
export type Factory<T = any> = (...providers: ProviderType[]) => T;

/**
 * instance fac.
 */
export interface InstFac<T = any> {
    /**
     * factory.
     */
    fac?: Factory<T>;
    /**
     * value or singleton instance.
     */
    value?: T;
    /**
     * instance provider.
     */
    provider?: Type<T>;
    /**
     * cache value.
     */
    cache?: T;
    /**
     * cache expires.
     */
    expires?: number;
}

export function getFacInstance<T>(pd: InstFac<T>, ...providers: ProviderType[]): T {
    if (!pd) return null;
    if (!isNil(pd.value)) return pd.value;
    if (pd.expires) {
        if (pd.expires > Date.now()) return pd.cache;
        pd.expires = null;
        pd.cache = null;
    }
    return pd.fac ? pd.fac(...providers) ?? null : null;
}

export function hasFacValue<T>(pd: InstFac<T>): boolean {
    return !isNil(pd?.value)
}
export function getFacValue<T>(pd: InstFac<T>): T {
    return pd?.value ?? null;
}

/**
 * Factory of Token
 */
export type FactoryLike<T> = T | Type<T> | Factory<T>;


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
     * formatting this.
     *
     * @returns {string}
     */
    formatting(): string {
        let key = this.format(this);
        let target = this.format(this.target)
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
    if (isClassType(target)) {
        return true;
    }
    return isProvideToken(target);
}

export function isTokenFunc(target: any): target is IToken<any> {
    return isFunction(target) && (<IToken>target).tokenId;
}


/**
 * check target is provide token or not.
 *
 * @export
 * @param {*} target
 * @returns {target is ProvideToken}
 */
export function isProvideToken(target: any): target is ProvideToken<any> {
    if (isString(target) || isSymbol(target) || (target instanceof Registration)) {
        return true
    }
    return isTokenFunc(target);
}

