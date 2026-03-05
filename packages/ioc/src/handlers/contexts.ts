import { Injector } from '../injector';
import { getType } from '../metadata/type';
import { InjectFlags, Token } from '../tokens';
import { AbstractType, Type } from '../types';
import { isNil } from '../utils/chk';
import { Context, ContextToken } from './Context';


/**
 * custom context.
 */
export class DefaultContext extends Context {

    private _type: Type;
    protected _parent?: Context;
    protected map: Map<Token | ContextToken, any>;

    constructor(
        contextOrEntries?: Context | Iterable<readonly [Token | ContextToken, any]>,
        entries?: Iterable<readonly [Token | ContextToken, any]>,
        inherit = true //?: boolean
    ) {
        super();
        if (contextOrEntries instanceof Context) {
            if (inherit) {
                this._parent = contextOrEntries;
                this.map = new Map(entries);
            } else {
                this.map = new Map((contextOrEntries as DefaultContext).map as Map<Token | ContextToken, any>);
                if (entries) {
                    for (const [k, v] of entries) {
                        this.map.set(k, v);
                    }
                }
            }
        } else {
            this.map = new Map(contextOrEntries);
        }
        this._type = getType(this);
        this.map.set(this._type, this);
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
    get<T>(token: Token<T> | ContextToken<T>, flags = InjectFlags.Default): T {
        if (!(flags & (InjectFlags.SkipSelf | InjectFlags.Host))) {
            if (this.map.has(token)) return this.map.get(token) as T;
            const val = this.getTokenValue(token, flags);
            if (!isNil(val)) {
                this.set(token, val);
                return val;
            }
        }

        if (this._parent && !(flags & InjectFlags.Self)) {
            return this._parent.get(token, flags);
        }

        if (token instanceof ContextToken) {
            const val = token.defaultValue();
            this.set(token, val);
            return val;
        }
        return null as T;
    }

    protected getTokenValue<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags): T {
        return null!;
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
    has<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags = InjectFlags.Default): boolean {
        if (!(flags & InjectFlags.SkipSelf) && this.map.has(token)) return true;
        if (this._parent && !(flags & InjectFlags.Self)) return this._parent.has(token, flags);
        return false;
    }

    // protected hasTokenValue<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags): boolean {
    //     return false;
    // }


    /**
     * Cast the context to the given type.
     * @param type 
     * @returns 
     */
    as<TContext extends Context>(type: Type<TContext>, entries?: Iterable<readonly [Token | ContextToken, any]>): TContext {
        let context = this.get(type);
        if (!context) {
            context = new type(this, entries);
            this.set(type, context);
        } else if (entries) {
            for (const [k, v] of entries) {
                context.set(k, v);
            }
        }
        return context;
    }

    clear(): void {
        this.map.clear();
    }

    /**
     * Lifecycle hook called when the context is destroyed.
     */
    onDestroy(): void {
        this.clear();
        // this.map = null!;
    }

}


const PAYLOAD = new ContextToken<any>(() => null);
const RUN_FAILED = new ContextToken<(target: AbstractType, propertyKey: string) => void>(() => null!);

export class RunContext extends DefaultContext {

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

    // protected override hasTokenValue<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags): boolean {
    //     if (token instanceof ContextToken) return false;
    //     return this.getInjector().has(token, flags);
    // }

    override getTokenValue<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags): T {
        if (token instanceof ContextToken) return null!;
        return this.getInjector().get(token, null, flags)!;
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

