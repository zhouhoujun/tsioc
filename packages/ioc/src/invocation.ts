import { Observable } from 'rxjs';
import { InvocationContext, InvocationOptions, InvokeOptions } from './context';
import { ClassRef } from './metadata/class';
import { AbstractType } from './types';
import { MethodType } from './injector';
import { DestroyCallback } from './destroy';
import { ResolveContext } from './resolver';


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
export abstract class Invocation<T = any, TRes = any, TC extends InvocationContext = InvocationContext> {
    /**
     * run when bootstrap or not
     */
    abstract get bootstrap(): boolean;
    /**
     * the invoke type.
     */
    abstract get type(): AbstractType<T>;
    /**
     * the invoke class.
     * 
     * 类反射
     */
    abstract get classRef(): ClassRef<T>;
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
    abstract get context(): TC;

    abstract getMethodContext(propertyKey: string | symbol): TC;

    /**
     * Invoke the underlying operation using the class given {@link InvocationContext}.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(): TRes;
    /**
     * Invoke the underlying operation using the class given {@link InvocationContext}.
     * @param args the arguments to use to invoke the operation
     */
    abstract invoke(args: any[]): TRes;
    /**
     * Invoke the underlying operation using the given {@link InvocationContext}.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(context: TC): TRes;
    /**
     * Invoke the underlying operation using the given {@link ResolveContext}.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(context: ResolveContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param option invoke arguments.
     */
    abstract invoke(options: InvokeOptions): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     */
    abstract invoke(method: MethodType<T>): TRes;
    /**
     * Invoke the underlying operation using the given {@link InvocationContext}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(method: MethodType<T>, context?: TC): TRes;
    /**
     * Invoke the underlying operation using the given {@link ResolveContext}.
     * @param method method name.
     * @param context the context to use to invoke the operation
     */
    abstract invoke(method: MethodType<T>, context?: ResolveContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param options invoke arguments.
     */
    abstract invoke(method: MethodType<T>, options?: InvokeOptions): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param args the arguments to use to invoke the operation
     */
    abstract invoke(method: MethodType<T>, args?: any[]): TRes;
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

/**
 * Invocation factory.
 *
 * 用于创建执行操作调用的接口。
 */
export abstract class InvocationFactory<TOpts extends InvocationOptions = InvocationOptions> {
    abstract create<T>(type: AbstractType<T> | ClassRef<T>, options?: TOpts): Invocation<T>;
}


