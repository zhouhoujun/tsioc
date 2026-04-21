import { Injector } from '../injector';
import { InjectFlags, Token } from '../tokens';
import { AbstractType, Type } from '../types';
import { Context, ContextToken } from '../context';
export declare class DefaultContext extends Context {
    private _type;
    protected _parent?: Context;
    protected map: Map<Token | ContextToken, any>;
    constructor(contextOrEntries?: Context | Iterable<readonly [Token | ContextToken, any]>, entries?: Iterable<readonly [Token | ContextToken, any]>, inherit?: boolean);
    /**
     * Store a value in the context. If a value is already present it will be overwritten.
     *
     * @param token The reference to an instance of `Token`.
     * @param value The value to store.
     *
     * @returns A reference to itself for easy chaining.
     */
    set<T>(token: Token<T> | ContextToken<T>, value: T): this;
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
    protected getTokenValue<T>(_token: Token<T> | ContextToken<T>, _flags: InjectFlags): T;
    /**
     * Delete the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns A reference to itself for easy chaining.
     */
    delete<T>(token: Token<T> | ContextToken<T>): this;
    /**
     * Checks for existence of a given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns True if the token exists, false otherwise.
     */
    has<T>(token: Token<T> | ContextToken<T>, flags?: InjectFlags): boolean;
    /**
     * Cast the context to the given type.
     * @param type
     * @returns
     */
    as<TContext extends Context>(type: Type<TContext>, entries?: Iterable<readonly [Token | ContextToken, any]>): TContext;
    clear(): void;
    /**
     * Lifecycle hook called when the context is destroyed.
     */
    onDestroy(): void;
}
/**
 * RunContext - Optimized context for runtime execution.
 *
 * Combines Context with Injector for efficient data passing during method invocation.
 * Avoids creating full InvocationContext instances when only runtime data is needed.
 *
 * 运行时上下文 - 优化的运行时执行上下文。
 * 结合 Context 和 Injector，在方法调用期间高效传递数据。
 * 当只需要运行时数据时，避免创建完整的 InvocationContext 实例。
 */
export declare class RunContext extends DefaultContext {
    private _injector?;
    getInjector(): Injector;
    setInjector(injector: Injector): this;
    getPayload<T = any>(): T;
    setPayload<T>(payload: T): this;
    getTokenValue<T>(token: Token<T> | ContextToken<T>, flags: InjectFlags): T;
    getFailed(): (target: AbstractType, propertyKey: string) => void;
}
export declare function createRunContext(injector: Injector, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
export declare function createRunContext(injector: Injector, previous?: Context, entries?: Iterable<readonly [Token | ContextToken, any]>): RunContext;
