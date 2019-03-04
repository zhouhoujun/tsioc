import { isBaseObject, isToken, Token, Type, Registration } from '@ts-ioc/ioc';

/**
 * ref service
 *
 * @export
 * @interface IRefService
 * @template T
 */
export interface IRefService<T> {
    /**
     * ref service
     *
     * @type {Token<T>}
     * @memberof IReference
     */
    service: Token<T>;
    /**
     * is private service of target class or not.
     *
     * @type {boolean}
     * @memberof IReference
     */
    isPrivate?: boolean;
}

/**
 * reference token type.
 */
export type RefTokenType<T> = IRefService<T> | Token<T>;

export type RefTokenFac<T> = (token: Token<any>) => RefTokenType<T> | RefTokenType<T>[];

export type RefTokenFacType<T> = Type<Registration<T>> | RefTokenType<T> | RefTokenFac<T>

/**
 * reference token.
 */
export type ReferenceToken<T> = RefTokenFacType<T> | RefTokenFacType<T>[];

/**
 * reference target level.
 *
 * @export
 * @enum {number}
 */
export enum RefTagLevel {
    /**
     * ref taget self only
     */
    self = 1,
    /**
     * ref taget provider.
     */
    providers = 1 << 1,
    /**
     * self provider
     */
    selfProviders = self | providers,
    /**
     * ref target class chain.
     */
    chain = 1 << 2,
    /**
     * self chain.
     */
     selfChain = self | chain,
    /**
     * chain providers.
     */
    chainProviders = chain | providers,
    /**
     * ref all.
     */
    all = self | providers | chain

}

/**
 * ref target
 *
 * @export
 * @interface IRefTarget
 */
export interface IRefTarget {
    /**
     * ref target.
     *
     * @type {Token<any>}
     * @memberof IRefTarget
     */
    target: Token<any>;
    /**
     * ref target level.
     *
     * @type {RefTagLevel}
     * @memberof IRefTarget
     */
    level: RefTagLevel;

}


/**
 * is reftarget options or not.
 *
 * @export
 * @param {*} target
 * @returns {target is IRefTarget}
 */
export function isRefTarget(target: any): target is IRefTarget {
    if (isBaseObject(target) !== true) {
        return false
    }
    return isToken(target.target);
}


/**
 * reference target.
 */
export type RefTarget = IRefTarget | Token<any> | Object;
