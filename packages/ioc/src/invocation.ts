import { Observable } from 'rxjs';
import { InvocationContext, InvocationOptions, InvokeArguments } from './context';
import { Class } from './metadata/class';
import { Type } from './types';
import { Injector, MethodType } from './injector';
import { DestroyCallback } from './destroy';
import { Handler, HandlerLike } from './handler';


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
export abstract class Invocation<T = any, TRes = any> implements Handler {
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
     * invocation injector.
     */
    abstract get injector(): Injector;

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
     * @param args the arguments to use to invoke the operation
     */
    abstract invoke(args: any[]): TRes;
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
    abstract invoke(method: MethodType<T>, context?: InvocationContext): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param options invoke arguments.
     */
    abstract invoke(method: MethodType<T>, options?: InvokeArguments): TRes;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param method method name.
     * @param args the arguments to use to invoke the operation
     */
    abstract invoke(method: MethodType<T>, args?: any[]): TRes;

    createHandler(method: MethodType<T>, options: InvokeArguments): HandlerLike {
        return (input: any, context?: any) => this.invoke(method, options);
    }

    /**
     * as handle
     * @param input 
     * @param context 
     */
    abstract handle(input: any, context?: any): any;
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
export abstract class InvocationFactory {
    abstract create<T>(type: Type<T> | Class<T>, options?: InvocationOptions<T>): Invocation<T>;
}


