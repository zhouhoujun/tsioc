import { AbstractType, Type, ClassType } from './types';
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
    constructor(private desc: string, readonly providedIn: Type | 'root' | 'platform' | string = '') { }

    toString(): string {
        return `Token ${this.desc}`;
    }

    to(alias: string): InjectToken<T> {
        return alias ? new InjectToken(`${this.desc}_${alias}`, this.providedIn) : this;
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
 * parse id string to token id.
 * @param key id
 */
export function tokenId<T = any>(key: string,): Token<T> {
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
export function getToken<T>(token: Token<T>, alias?: string): Token<T> {
    if (!alias) return token;
    if (token instanceof InjectToken) {
        return token.to(alias);
    }
    return `${format(token)}_${alias}`;
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
    if (!isFunction(target)) {
        return isString(target) || isSymbol(target) || isInjectToken(target);
    }
    return isClassType(target);
}

export function isInjectToken<T>(target: any): target is InjectToken<T> {
    return target instanceof InjectToken;
}


/**
 * Injection flags for DI.
 *
 * @publicApi
 */
export enum InjectFlags {

    /** Check self and check parent injector if needed */
    Default = 0b0000,

    /**
     * Specifies that an injector should retrieve a dependency from any injector until reaching the
     * host element of the current component. (Only used with Element Injector)
     */
    Host = 0b0001,

    /** Don't ascend to ancestors of the node requesting injection. */
    Self = 0b0010,

    /** Skip the node that is requesting injection. */
    SkipSelf = 0b0100,

    /** Inject `defaultValue` instead if token not found. */
    Optional = 0b1000,
}


