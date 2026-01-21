import { Token } from '../tokens';
import { Type } from '../types';

/**
 * context token.
 */
export class ContextToken<T = any> {
    constructor(readonly defaultValue: () => T) { }
}

export abstract class Context {

    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    abstract set<T>(token: Token<T> | ContextToken<T>, value: T): Context;

    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    abstract get<T>(token: ContextToken<T>): T;

    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    abstract get<T>(token: Token<T>): T;

    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    abstract get<T>(token: Token<T> | ContextToken<T>): T;

    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    abstract delete<T>(token: Token<T> | ContextToken<T>): Context;

    /**
     * Checks for existence of a given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns True if the token exists, false otherwise.
     */
    abstract has<T>(token: Token<T> | ContextToken<T>): boolean;

    /**
     * clear all value
     */
    abstract clear(): void;

    /**
     * Lifecycle hook called when the context is destroyed.
     */
    abstract onDestroy(): void;


    abstract as<TContext extends Context>(type: Type<TContext>, entries?: Iterable<readonly [Token | ContextToken, any]>): TContext;
}

