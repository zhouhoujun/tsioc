import { AbstractType, Type, ClassType, Modules } from './types';
import { IProvider } from './IInjector';
import { StaticProvider } from './providers';
import { isFunction, isClassType, isSymbol, isString } from './utils/chk';
import { getClassName } from './utils/lang';


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
        return `Token ${this.desc}`;
    }
}

/**
 * factory tocken.
 */
export type Token<T = any> = string | symbol | InjectToken<T> | ClassType<T>;

/**
 * provide token
 */
export type ProvideToken<T> = string | symbol | InjectToken<T> | AbstractType;

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
export type FactoryLike<T> = Type<T> | Factory<T>;

/**
 * parse id string to token id.
 * @param key id
 */
export function tokenId<T = any>(key: string): Token<T> {
    return Symbol(key);
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
export function tokenRef<T>(token: Token<T>, target: Token): Token<T> {
    return `Ref ${format(token)} for ${format(target)}`;
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
export function isProvide(target: any): target is ProvideToken<any> {
    if (isFunction(target)) return false;
    return isString(target) || isSymbol(target) || (target instanceof InjectToken);
}

