import { Type, TypeOf } from './types';
import { isFunction } from './utils/chk';
import { getClassName } from './utils/lang';


/**
 * inject token.
 * 
 * 注入标记令牌类
 *
 * @export
 * @class InjectToken
 * @template T
 */
export class InjectToken<T = any> {
    constructor(
        protected desc: string,
        readonly providedIn: Type | 'root' | 'platform' | string = '') { }

    toString(): string {
        return `Token ${this.desc}`
    }

    to(alias: string): InjectToken<T> {
        return alias ? new InjectToken(`${this.desc}_${alias}`, this.providedIn) : this
    }
}

/**
 * factory tocken.
 * 
 * 标记令牌
 */
export type Token<T = any> = string | symbol | InjectToken<T> | Type<T>;

/**
 * provide token
 */
export type ProvideToken<T> = string | symbol | InjectToken<T> | Type<T>;

/**
 * parse id string to token, type of {@link Token}.
 * @param key id
 */
export function tokenId<T = any>(key: string): Token<T> {
    return Symbol(key)
}

/**
 * format token.
 * @param token 
 * @returns 
 */
export function formatToken(token: Token) {
    return isFunction(token) ? `${getClassName(token)}` : token.toString()
}

/**
 * get token with alias.
 * @param token token
 * @param alias the alias of token.
 */
export function getToken<T>(token: Token<T>, alias?: string): Token<T> {
    if (!alias) return token;
    if (token instanceof InjectToken) {
        return token.to(alias)
    }
    return `${formatToken(token)}_${alias}`
}

/**
 * get token of type
 * @param type target type
 * @param alias token alias
 * @param propertyKey target propertyKey
 * @returns 
 */
export function getTokenOf<T>(type: TypeOf<any>, alias: string, propertyKey?: string): Token<T> {
    return propertyKey ? `${getClassName(type)}_${propertyKey}_${alias}` : `${getClassName(type)}_${alias}`;
}

/**
 * is target instance of {@link InjectToken} or not.
 * @param target 
 * @returns 
 */
export function isInjectToken<T>(target: any): target is InjectToken<T> {
    return target instanceof InjectToken
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

    /**
     * HostOnly for InvocationContext.
     */
    HostOnly = 0b10000,

    /**
     * Resolve value with new Context.
     */
    Resolve = 0b100000,

    /**
     * Param provide with Request Context.
     */
    Request = 0b1000000
}


