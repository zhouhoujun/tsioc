import { AbstractType, Type } from './types';
import { InjectFlags, Token, TokenOf } from './tokens';
import { ResolveInterceptorLike } from './resolver';
import { Provider } from './providers';
import { Injector } from './injector';
/**
 * context token.
 */
export declare class ContextToken<T = any> {
    readonly defaultValue: () => T;
    constructor(defaultValue: () => T);
}
export declare abstract class Context {
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
    abstract get<T>(token: ContextToken<T>, flags?: InjectFlags): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    abstract get<T>(token: Token<T>, flags?: InjectFlags): T;
    /**
     * Retrieve the value associated with the given token.
     *
     * @param token The reference to an instance of `Token`.
     *
     * @returns The stored value or default if one is defined.
     */
    abstract get<T>(token: Token<T> | ContextToken<T>, flags?: InjectFlags): T;
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
    abstract has<T>(token: Token<T> | ContextToken<T>, flags?: InjectFlags): boolean;
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
/**
 * token value pair.
 *
 * 标记值键值对
 */
export type TokenValue<T = any> = [Token<T>, T];
/**
 * invoke providers.
 */
export interface InvokeProviders {
    /**
     * token values.
     *
     * 调用接口的标记值键值对
     */
    values?: TokenValue[];
    /**
     * custom resolvers.
     *
     * 调用接口的参数解析器
     */
    resolvers?: TokenOf<ResolveInterceptorLike>[];
    /**
     * custom providers.
     *
     * 调用接口的提供者
     */
    providers?: Provider[];
}
/**
 * invoke options.
 *
 * 调用接口配置项
 */
export interface InvokeOptions extends InvokeProviders {
    /**
     * payload.
     *
     * 调用接口的负载
     */
    payload?: any;
}
/**
 * invoke arguments.
 *
 * 调用接口配置项及负载
 */
export interface TargetInvokeArguments extends InvokeOptions {
    /**
     * invocation invoke target type.
     */
    targetType?: AbstractType;
    /**
     * named of invocation target propertyKey.
     */
    propertyKey?: string | symbol;
    /**
     * is resolve context or not.
     */
    isResolve?: boolean;
}
/**
 * InvocationOptions
 */
export interface InvocationOptions<T = any> extends InvokeOptions {
    /**
     * injector
     */
    injector?: Injector;
    /**
     * invocation invoke target type.
     */
    targetType?: AbstractType<T>;
    /**
     * instance or instance factory of target type.
     */
    instance?: T | ((injector?: Injector) => T);
    /**
    * the propertyKey method to invoke of this invocation.
    */
    propertyKey?: string | symbol;
    /**
     * run when bootstrap or not.
     */
    bootstrap?: boolean;
}
export declare function hasContextOptions(option?: InvokeOptions): boolean;
