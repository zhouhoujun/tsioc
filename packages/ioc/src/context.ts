import { AbstractType, TypeOf } from './types';
import { InjectFlags, Token } from './tokens';
import { Abstract } from './metadata/fac';
import { DestroyCallback, Destroyable, OnDestroy } from './destroy';
import { Injector, InjectOperator, InjectorScope } from './injector';
import { Parameter, ResolveInterceptorLike } from './resolver';
import { Provider } from './providers';
import { Exception } from './exception';
import { Invocation } from './invocation';
import { hasItem } from './utils/lang';
import { isDefined } from './utils/chk';
import { Runtime } from './runtime';


/**
 * The context for the {@link Invocation invocation of an operation}.
 * 
 * 执行操作调用的接口上下文
 */
@Abstract()
export abstract class InvocationContext<TParent extends Injector = Injector> implements Injector, Destroyable, OnDestroy {
    /**
     * injector scope.
     * 
     * 容器范围
     */
    readonly scope?: InjectorScope;
    /**
     * init inject ready.
     */
    abstract get ready(): Promise<void>;
    /**
     * is resolve context or not.
     */
    abstract get isResolve(): boolean;
    /**
     * is this context injected in object or not.
     */
    abstract get used(): boolean;
    /**
     * get runtime.
     * 
     * 容器运行环境
     */
    abstract getRuntime(): Runtime;
    /**
     * get parent context.
     */
    abstract getParent(): TParent;
    /**
     * get inject operator.
     * 
     * 获取注入器操作器。
     */
    abstract getInject(): InjectOperator;
    /**
     * invocation target.
     */
    abstract get targetType(): AbstractType | undefined;
    /**
     * named of invocation method.
     */
    abstract get propertyKey(): string | symbol | undefined;
    /**
     * add reference resolver.
     * @param contexts the list instance of {@link InvocationContext}.
     */
    abstract addRef(...contexts: InvocationContext[]): void;
    /**
     * remove reference resolver.
     * @param context instance of {@link InvocationContext}.
     */
    abstract removeRef(...contexts: InvocationContext[]): void;
    /**
     * has ref or not.
     * @param context 
     */
    abstract hasRef(context: InvocationContext): boolean;
    /**
     * attach extend with options.
     * @param options 
     */
    abstract attach(options: InvocationContext | InvokeOptions): void;
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
     * get token factory resolve instace in current.
     *
     * 获取标记令牌的实例。
     * @template T
     * @param {Token<T>} token token id {@link Token}.
     * @param {T} notFoundValue not found token, return this value.
     * @param {InjectFlags} flags check strategy by inject flags {@link InjectFlags}.
     * @returns {T} token value.
     */
    abstract get<T>(token: Token<T>, notFoundValue?: T, flags?: InjectFlags, context?: InvocationContext): T;

    /**
     * set value.
     * 
     * 设置上下文中标记指令的实例值
     * @param token token
     * @param value value for the token.
     */
    abstract setValue<T>(token: Token<T>, value: T): this;
    /**
     * resolve parameter of targetType.
     * 
     * 解析标记令牌的实例。
     *
     * @template T
     * @param {Parameter<T>} parameter the resolve parameter {@link Parameter}.
     * @param {AbstractType} targetType the parameter of type.
     * 
     * @returns {T}
     */
    abstract resolve<T>(parameter: Parameter<T>, targetType?: AbstractType): T;
    /**
     * resolve token in context.
     * 
     * 解析上下文中标记指令的实例值
     * @param token
     * @param flags InjectFalgs 
     */
    abstract resolve<T>(token: Token<T>, falgs?: InjectFlags): T;
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
export function createContext(parent: Injector | InvocationContext, options?: TargetInvokeArguments, scope?: AbstractType | 'static'): InvocationContext {
    return INVOCATION_CONTEXT_IMPL.create(parent, options, scope)
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
    create(parent: Injector | InvocationContext, options?: TargetInvokeArguments, scope?: AbstractType | 'static'): InvocationContext {
        throw new Exception('not implemented.')
    },
    isContext(ctx: any): ctx is InvocationContext {
        throw new Exception('not implemented.')
    }
};

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
    resolvers?: TypeOf<ResolveInterceptorLike>[];
    /**
     * custom providers.
     * 
     * 调用接口的提供者
     */
    providers?: Provider[];
}


// export interface InvokeParentContext {
//     /**
//      * parent InvocationContext,
//      * 
//      * 上级上下文
//      */
//     parent?: InvocationContext;

// }

/**
 * invoke options.
 * 
 * 调用接口配置项
 */
export interface InvokeOptions extends InvokeProviders {
    /**
     * is resolve context or not.
     */
    isResolve?: boolean;
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
    instance?: T | ((context?: InvocationContext) => T);
    /**
    * the propertyKey method to invoke of this invocation.
    */
    propertyKey?: string | symbol;
}



export function hasContextOptions(option?: InvokeOptions): boolean {
    if (!option) return false;
    return hasItem(option.providers) || hasItem(option.resolvers) || hasItem(option.values);
}

