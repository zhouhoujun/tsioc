import { Observable } from 'rxjs';
import { InvocationContext, InvokeArguments, InvokeParentContext } from './context';
import { Class } from './metadata/class';
import { Type } from './types';
import { Injector, MethodType } from './injector';
import { DestroyCallback } from './destroy';
import { Abstract } from './metadata/fac';


/**
 * asyc like
 * 
 * 异步数据
 */
export type AsyncLike<T> = T | Promise<T> | Observable<T>;

/**
 * Invocation invoker.
 *
 * 用于执行操作调用的接口。
 */
@Abstract()
export abstract class Invocation<T = any, TRes = any> {
    /**
     * the invoke type.
     */
    abstract get type(): Type<T>;
    /**
     * the invoke class.
     * 
     * 类反射
     */
    abstract get class(): Class<T>;
    /**
     * the invoke instance.
     *
     * 调用的实例对象
     */
    abstract get instance(): T;

    /**
     * `InvocationContext` of invocation invoker.
     * 
     * 调用类方法的上下文环境
     */
    abstract get context(): InvocationContext;

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(context: InvocationContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param option invoke arguments.
     */
    abstract invoke(options: InvokeArguments): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     */
    abstract invoke(method: MethodType<T>): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(method: MethodType<T>, context: InvocationContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param option invoke arguments.
     */
    abstract invoke(method: MethodType<T>, context: InvokeArguments): TRes;
    /**
     * is equals to target or not.
     * @param target 
     */
    abstract equals(target: Invocation): boolean;

    /**
     * destroyed or not.
     * 
     * 类反射销毁与否
     */
    abstract get destroyed(): boolean;
    /**
     * destroy this.
     * 
     * 销毁当前调用
     */
    abstract destroy(): void | Promise<void>;
    /**
     * register callback on destroy, or destroy this.
     * 
     * 传回调函数参数则注册销毁回调函数，否则执行销毁操作
     * 
     * @param callback destroy callback
     */
    abstract onDestroy(callback?: DestroyCallback): void | Promise<void>;
}


export interface InvocationOptions<T = any, TArg = any> extends InvokeParentContext, InvokeArguments<TArg> {
    injector?: Injector;
    /**
     * instance or instance factory of target type.
     */
    instance?: T | (() => T);
    /**
    * the propertyKey method to invoke of this invocation.
    */
    propertyKey?: string | symbol;
}

/**
 * Invocation factory.
 *
 * 用于创建执行操作调用的接口。
 */
@Abstract()
export abstract class InvocationFactory<T = any> {
    abstract get class(): Class<T>;
    abstract get context(): InvocationContext;
    abstract create(options?: InvocationOptions<T>): Invocation<T>;
}


/**
 * Invocation factory resolver.
 */
@Abstract()
export abstract class InvocationFactoryResolver {
    /**
     * resolve invocation factory.
     * @param type factory type.
     * @param context invocation context.
     */
    abstract resolve<T>(type: Type<T> | Class<T>, contex?: InvocationContext): InvocationFactory<T>;
}


