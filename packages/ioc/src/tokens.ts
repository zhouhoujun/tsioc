import { getType, getTypeName } from './metadata/type';
import { AbstractType, TypeOf } from './types';
import { isString } from './utils/chk';


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
        readonly providedIn: AbstractType | 'root' | 'platform' | null = null) { }

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
export type Token<T = any> = string | InjectToken<T> | AbstractType<T>;


/**
 * create token, type of {@link InjectToken}.
 * @param desc
 */
export function token<T = any>(desc: string, providedIn?: AbstractType | 'root' | 'platform'): InjectToken<T> {
    return new InjectToken<T>(desc, providedIn);
}

const tokens = new Map<string, Token>();
const tokenByAlias = new WeakMap<object, Map<string, Token>>();

function getTokenKey(token: Token, alias: string): string {
    if (typeof token === 'string') {
        return `str:${token}:${alias}`;
    }
    if (token instanceof InjectToken) {
        return `inj:${token.toString()}:${alias}`;
    }
    return `typ:${getTypeName(token)}:${alias}`;
}

export function getToken<T>(token: Token<T>, alias?: string): Token<T>;
export function getToken<T>(token: Token, alias?: string): Token<T>;
export function getToken(token: Token, alias?: string): Token<any> {
    if (!alias) return token;

    const key = getTokenKey(token, alias);
    const cached = tokens.get(key);
    if (cached) return cached;

    let maps: Map<string, Token> | undefined;
    if (typeof token !== 'string') {
        maps = tokenByAlias.get(token as object);
        if (!maps) {
            maps = new Map();
            tokenByAlias.set(token as object, maps);
        }
    }

    let atk: Token;
    if (token instanceof InjectToken) {
        atk = token.to(alias);
    } else {
        const type = isString(token) ? token : getTypeName(token);
        atk = new InjectToken(`${type}_${alias}`);
    }

    tokens.set(key, atk);
    maps?.set(alias, atk);

    return atk;
}

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
export function getTokenOf<T>(type: TypeOf<any>, alias: string, propertyKey?: string): Token<T> {
    return getToken<T>(getType(type), propertyKey ? `${propertyKey}_${alias}` : alias)
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

    // /**
    //  * HostOnly for InvocationContext.
    //  */
    // HostOnly = 0b10000,

    // /**
    //  * None Singleton
    //  */
    // NonSingleton = 0b100000,

    /**
     * Resolve value with new Context.
     */
    Resolve = 0b1000000,

    /**
     * Param provide with Request Context.
     */
    Request = 0b10000000,
    NonSingleton
}


