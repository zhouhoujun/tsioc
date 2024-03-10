import { Type } from './types';
import { InjectFlags, Token } from './tokens';
import { Abstract } from './metadata/fac';
import { DestroyCallback, Destroyable, OnDestroy } from './destroy';
import { Injector } from './injector';
import { ArgumentResolver, Parameter } from './resolver';
import { ProvdierOf, ProviderType } from './providers';
import { Execption } from './execption';
import { OperationInvoker } from './operation';


/**
 * The context for the {@link OperationInvoker invocation of an operation}.
 * 
 * 执行操作调用的接口上下文
 */
@Abstract()
export abstract class InvocationContext<T = any> implements Destroyable, OnDestroy {
    /**
     * is resolve context or not.
     */
    abstract get isResolve(): boolean;
    /**
     * is this context injected in object or not.
     */
    abstract get used(): boolean;
    /**
     * invocation static injector. 
     */
    abstract get injector(): Injector;
    /**
     * invocation target.
     */
    abstract get targetType(): Type | undefined;
    /**
     * named of invocation method.
     */
    abstract get methodName(): string | undefined;
    /**
     * add reference resolver.
     * @param resolvers the list instance of {@link InvocationContext}.
     */
    abstract addRef(...resolvers: InvocationContext[]): void;
    /**
     * remove reference resolver.
     * @param resolver instance of {@link InvocationContext}.
     */
    abstract removeRef(resolver: InvocationContext): void;
    /**
     * has ref or not.
     * @param ctx 
     */
    abstract hasRef(ctx: InvocationContext): boolean;
    /**
     * the invocation arguments.
     */
    abstract get args(): T;
    /**
     * get value ify create by factory and register the value for the token.
     * 
     * 获取上下文中标记指令的值，如果没有注入，则根据工厂函数注入该标记指令，并返回值。
     * @param token the token to get value.
     * @param factory the factory to create value for token.
     * @returns the instance of token.
     */
    abstract getValueify<T>(token: Token<T>, factory: () => T): T;
    /**
     * has token in the context or not.
     * 
     * 上下文中是否有注入该标记指令
     * @param token the token to check.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns boolean.
     */
    abstract has(token: Token, flags?: InjectFlags): boolean;
    /**
     * get token value.
     * 
     * 获取上下文中标记指令的实例值
     * @param token the token to get value.
     * @param flags inject flags, type of {@link InjectFlags}.
     * @returns the instance of token.
     */
    abstract get<T>(token: Token<T>, flags?: InjectFlags): T;
    /**
     * set value.
     * 
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    abstract setValue<T>(token: Token<T>, value: T): this;
    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token
     * @param flags InjectFalgs 
     */
    abstract resolve<T>(token: Token<T>, falgs?: InjectFlags): T;
    /**
     * resolve the parameter value.
     * 
     * 解析调用参数
     * @param meta property or parameter metadata type of {@link Parameter}.
     * @param target resolve parameter for target type. 
     * @returns the parameter value in this context.
     */
    abstract resolveArgument<T>(meta: Parameter<T>, target?: Type, failed?: (target: Type, propertyKey: string) => void): T | null;
    /**
     * context destroyed or not.
     * 
     * 上下文销毁与否
     */
    abstract get destroyed(): boolean;
    /**
     * register callback on destroy.
     * 
     * 传回调函数参数则注册销毁回调函数，否则执行销毁操作
     * @param callback destroy callback
     */
    abstract onDestroy(callback?: DestroyCallback): void;
    /**
     * destroy this.
     * 
     * 销毁上下文
     */
    abstract destroy(): void;
}


/**
 * create invocation context.
 * 
 * 创建调用上下文
 * @param parent 
 * @param options 
 * @returns 
 */
export function createContext<TArg>(parent: Injector | InvocationContext, options?: TargetInvokeArguments<TArg>): InvocationContext {
    return INVOCATION_CONTEXT_IMPL.create(parent, options)
}

/**
 * invocation context factory implement.
 */
export const INVOCATION_CONTEXT_IMPL = {
    /**
     * create invocation context
     * @param parent parent context or parent injector. 
     * @param options invocation options.
     */
    create<TArg>(parent: Injector | InvocationContext, options?: TargetInvokeArguments<TArg>): InvocationContext {
        throw new Execption('not implemented.')
    }
};


/**
 * token value pair.
 * 
 * 标记值键值对
 */
export type TokenValue<T = any> = [Token<T>, T];

/**
 * invoke options.
 * 
 * 调用接口配置项
 */
export interface InvokeOptions {
    /**
     * is resolve context or not.
     */
    isResolve?: boolean;
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
    resolvers?: ProvdierOf<ArgumentResolver>[];
    /**
     * custom providers.
     * 
     * 调用接口的提供者
     */
    providers?: ProviderType[];
}


/**
 * invoke arguments.
 * 
 * 调用接口配置项及负载
 */
export interface InvokeArguments<TArg = any> extends InvokeOptions {
    /**
     * invocation arguments.
     * 
     * 调用接口负载对象
     */
    args?: ProvdierOf<TArg>;
    /**
     * parent InvocationContext,
     * 
     * 上级上下文
     */
    parent?: InvocationContext;
}

/**
 * invoke arguments.
 * 
 * 调用接口配置项及负载
 */
export interface TargetInvokeArguments<TArg = any> extends InvokeArguments<TArg> {
    /**
     * invocation invoke target type.
     */
    targetType?: Type;
    /**
     * named of invocation target method.
     */
    methodName?: string;
}
