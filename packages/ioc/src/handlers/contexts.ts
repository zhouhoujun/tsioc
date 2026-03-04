import { Injector } from '../injector';
import { getType } from '../metadata/type';
import { InjectFlags, Token } from '../tokens';
import { AbstractType, Type } from '../types';
import { Context, ContextToken } from './Context';


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
    get<T>(token: Token<T>, flags?: InjectFlags): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    get<T>(token: Token<T> | ContextToken<T>, flags?: InjectFlags): T {
        if (token instanceof ContextToken) {
            return this.getContentToken(token)
        }
        return this.getToken(token, flags);
    }

    protected getToken<T>(token: Token<T>, flags?: InjectFlags) {
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
    as<TContext extends Context>(type: Type<TContext>, entries?: Iterable<readonly [Token | ContextToken, any]>): TContext {
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


const PAYLOAD = new ContextToken<any>(() => null);
const RUN_FAILED = new ContextToken<(target: AbstractType, propertyKey: string) => void>(() => null!);
// const RESOLVER_INJECTOR = new ContextToken<Injector>(() => null!);

export class RunContext extends DefaultContext {

    constructor(contextOrEntries?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
        super(contextOrEntries, entries);
    }

    getInjector() {
        return this.get(Injector)
    }

    setInjector(injector: Injector): this {
        return this.set(Injector, injector)
    }
    
    getPayload<T = any>(): T {
        return this.get(PAYLOAD) as T;
    }

    setPayload<T>(payload: T) {
        this.set(PAYLOAD, payload);
        return this;
    }

    protected override getToken<T>(token: Token<T>) {
        return this.map.get(token) ?? this.getFromInjector(token)
    }

    protected getFromInjector<T>(token: Token<T>) {
        const value = this.getInjector().get(token);
        this.set(token, value);
        return value;
    }

    getFailed(): (target: AbstractType, propertyKey: string) => void {
        return this.get(RUN_FAILED);
    }


}

export function createRunContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export function createRunContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export function createRunContext(injector: Injector, previous?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>) {
    const context = new RunContext(previous ?? entries, entries);
    context.setInjector(injector);
    return context;
}

