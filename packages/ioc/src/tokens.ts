import { AbstractType, Type, ClassType, Modules } from './types';
import { IProvider } from './IInjector';
import { StaticProvider } from './providers';
import { isFunction, isClassType, isSymbol, isAbstractClass } from './utils/chk';
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
 *
 * @export
 * @class InjectToken
 * @template T
 */
export class InjectToken<T = any> {
    constructor(private desc: string, private _providedIn?: Type<any> | 'root') { }

    get providedIn() {
        return this._providedIn;
    }

    toString(): string {
        return `InjectToken ${this.desc}`;
    }
}

function format(token: Token) {
    return isFunction(token) ? `{${getClassName(token)}}` : token.toString();
}

/**
 * get token with alias.
 * @param token token
 * @param alias the alias of token.
 */
export function getToken<T>(token: Token<T>, alias: string): Token<T> {
    return alias ? `${format(token)}_${alias}` : token;
}

/**
 * create token ref
 * @param token token
 * @param target token ref target.
 */
export function tokenRef<T>(token: Token<T>, target: Token): TokenId<T> {
    return `Ref ${format(token)} for ${format(target)}`;
}

/**
 *  token id.
 */
export type TokenId<T = any> = string | symbol | IToken<T>;


/**
 * factory tocken.
 */
export type Token<T = any> = InjectToken<T> | ClassType<T> | TokenId<T>;

/**
 * provide token
 */
export type ProvideToken<T> = InjectToken<T> | TokenId<T> | AbstractType;

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

    /**
     * unregister callback.
     */
    unreg?: () => void;
}

/**
 * Factory of Token
 */
export type FactoryLike<T> = T | Type<T> | Factory<T>;




/**
 * parse id string to token id.
 * @param key id
 */
export function tokenId<T = any>(key: string): TokenId<T> {
    return Symbol(key);
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
    if (isProvide(target)) {
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
export function isProvide(target: any, abstract?: boolean): target is ProvideToken<any> {
    if (isFunction(target)) {
        if ((target as IToken).tokenId) return true;
        return abstract ? isAbstractClass(target) : false;
    }
    return isSymbol(target) || (target instanceof InjectToken);
}

/**
 * is provide token.
 */
export const isProvideToken = isProvide;
