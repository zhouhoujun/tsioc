import { AbstractType } from './types';
import { Token, TokenOf } from './tokens';
import { ResolveInterceptorLike } from './resolver';
import { Provider } from './providers';
import { Injector } from './injector';
import { isArray } from './utils/chk';


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


export function hasContextOptions(option?: InvokeOptions): boolean {
    if (!option) return false;
    return isArray(option.providers ?? option.resolvers ?? option.values);
}

