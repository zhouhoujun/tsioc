import { getType } from '../metadata/type';
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


    abstract as<TContext extends DefaultContext>(type: Type<TContext>, entries?: Iterable<readonly [Token | ContextToken, any]>): TContext;
}


/**
 * custom context.
 */
export class DefaultContext extends Context {

    private _type: Type;
    // private _tokens?: Set<Token | ContextToken>;
    protected map: Map<Token | ContextToken, any> | Context;
    private _canClear: boolean;

    constructor(contextOrEntries?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
        super();
        if(contextOrEntries instanceof Context) {
            this.map = contextOrEntries as Context;
            this.setEntries(entries);
            this._canClear = false;
            // this._tokens = new Set();
        } else {
            this.map = new Map(contextOrEntries);
            this._canClear = true;
        }
        this._type = getType(this);
        this.set(this._type, this);
    }

    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    set<T>(token: Token<T> | ContextToken<T>, value: T) {
        this.map.set(token, value);
        // this._tokens?.add(token);
        return this;
    }
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: ContextToken<T>): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T>): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T> | ContextToken<T>): T {
        if (token instanceof ContextToken) {
            return this.getContentToken(token)
        }
        return this.getToken(token);
    }

    protected getToken<T>(token: Token<T>) {
        return this.map.get(token) ?? null;
    }

    protected getContentToken<T>(token: ContextToken<T>) {
        if (!this.map.has(token)) {
            this.map.set(token, token.defaultValue());
        }
        return this.map.get(token) ?? null;
    }

    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    delete<T>(token: Token<T> | ContextToken<T>) {
        this.map.delete(token);
        return this;
    }
    /**
     * Checks for existence of a given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns True if the token exists, false otherwise.
     */
    has<T>(token: Token<T> | ContextToken<T>): boolean {
        return this.map.has(token);
    }

    /**
     * Cast the context to the given type.
     * @param type 
     * @returns 
     */
    as<TContext extends DefaultContext>(type: Type<TContext>, entries?: Iterable<readonly [Token | ContextToken, any]>): TContext {
        if (type == this._type) {
            this.setEntries(entries);
            return this as any;
        }
        let context = this.get(type);
        if (!context) {
            context = new type(this);
            this.set(type, context);
            this.setEntries(entries);
        }
        return context;
    }

    private setEntries(entries?: Iterable<readonly [Token | ContextToken, any]>) {
        if (!entries) return;
        for (const [k, v] of entries) {
            this.set(k, v);
        }
    }

    clear(): void {
        if (this._canClear) {
            this.map.clear();
        } else {
            this.map.delete(this._type);
        }
        // if (this._tokens) {
        //     for (const token of this._tokens) {
        //         this.map.delete(token);
        //     }
        //     this._tokens.clear();
        // } else {
        //     this.map.clear();
        // }
    }

    /**
     * Lifecycle hook called when the context is destroyed.
     */
    onDestroy(): void {
        this.clear();
        // this.map = null!;
        // this._tokens = null!;
    }

}
