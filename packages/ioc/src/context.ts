import { AbstractType } from './types';
import { Token, TokenOf } from './tokens';
import { ResolveInterceptorLike } from './resolver';
import { Provider } from './providers';
import { Injector } from './injector';
import { isArray } from './utils/chk';
import { Context } from './handlers/Context';


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
export abstract class InvocationContext extends Context {

    abstract getInjector(): Injector;

    abstract setInjector(injector: Injector): this;

    abstract getPayload<T = any>(): T;

    abstract setPayload<T>(payload: T): this;

    abstract onFailed(failed: (target: AbstractType, propertyKey: string) => void): this;

}

export function hasContextOptions(option?: InvokeOptions): boolean {
    if (!option) return false;
    return isArray(option.providers ?? option.resolvers ?? option.values);
}

