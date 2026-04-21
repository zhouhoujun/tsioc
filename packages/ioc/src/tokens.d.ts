import { AbstractType, TypeOf } from './types';
/**
 * inject token.
 *
 * 注入标记令牌类
 *
 * @export
 * @class InjectToken
 * @template T
 */
export declare class InjectToken<T = any> {
    protected desc: string;
    readonly providedIn: AbstractType | 'root' | 'platform' | null;
    constructor(desc: string, providedIn?: AbstractType | 'root' | 'platform' | null);
    toString(): string;
    to(alias: string): InjectToken<T>;
}
/**
 * factory tocken.
 *
 * 标记令牌
 */
export type Token<T = any> = string | InjectToken<T> | AbstractType<T>;
/**
 * create token, type of {@link InjectToken}.
 * @param desc
 */
export declare function token<T = any>(desc: string, providedIn?: AbstractType | 'root' | 'platform'): InjectToken<T>;
export declare function getToken<T>(token: Token<T>, alias?: string): Token<T>;
export declare function getToken<T>(token: Token, alias?: string): Token<T>;
/**
 * token or instance.
 */
export type TokenOf<T> = Token<T> | Exclude<T, Function>;
/**
 * get token of type
 * @param type target type
 * @param alias token alias
 * @param propertyKey target propertyKey
 * @returns
 */
export declare function getTokenOf<T>(type: TypeOf<any>, alias: string, propertyKey?: string): Token<T>;
/**
 * Injection flags for DI.
 *
 * @publicApi
 */
export declare enum InjectFlags {
    /** Check self and check parent injector if needed */
    Default = 0,
    /**
     * Specifies that an injector should retrieve a dependency from any injector until reaching the
     * host element of the current component. (Only used with Element Injector)
     */
    Host = 1,
    /** Don't ascend to ancestors of the node requesting injection. */
    Self = 2,
    /** Skip the node that is requesting injection. */
    SkipSelf = 4,
    /** Inject `defaultValue` instead if token not found. */
    Optional = 8,
    /**
     * Resolve value with new Context.
     */
    Resolve = 64,
    /**
     * Param provide with Request Context.
     */
    Request = 128,
    NonSingleton = 129
}
