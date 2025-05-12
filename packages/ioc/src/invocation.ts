import { Observable } from 'rxjs';
import { InvocationContext, InvokeArguments, InvokeParentContext } from './context';
import { Class } from './metadata/class';
import { Type } from './types';
import { Injector, MethodType } from './injector';
import { DestroyCallback } from './destroy';


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


export interface InvokerOptions<T = any, TArg = any> extends InvokeParentContext, InvokeArguments<TArg> {
    /**
     * instance or instance factory of target type.
     */
    instance?: T | (() => T);
    /**
    * named of invocation target propertyKey.
    */
    propertyKey?: string | symbol;
}

/**
 * Invocation factory.
 *
 * 用于创建执行操作调用的接口。
 */
export abstract class InvocationFactory {
    abstract create<T>(type: Type<T> | Class<T>, injector: Injector, options?: InvokerOptions<T>): Invocation<T>;
}



// /**
//  * Interface to perform an operation invocation.
//  * 
//  * 用于执行操作调用的接口。
//  */
// export interface Invocation<T = any> {
//     /**
//      * type ref.
//      * 
//      * 类反射
//      */
//     get typeRef(): ReflectiveRef;

//     /**
//      * `InvocationContext` of operation method
//      * 
//      * 调用类方法的上下文环境
//      */
//     get context(): InvocationContext;
//     /**
//      * invoker order.
//      * 
//      * 调用方法顺序
//      */
//     order?: number;
//     /**
//      * method return type.
//      */
//     get returnType(): Type;
//     /**
//      * invoke method name
//      * 
//      * 调用类方法名称
//      */
//     get method(): string;
//     /**
//      * origin method descriptor.
//      * 
//      * 类方法描述符
//      */
//     get descriptor(): TypedPropertyDescriptor<T>;
//     /**
//      * Invoke the underlying operation using the given {@code context}.
//      * @param context the context to use to invoke the operation
//      */
//     invoke(): T;
//     /**
//      * Invoke the underlying operation using the given {@code context}.
//      * @param context the context to use to invoke the operation
//      */
//     invoke(context: InvocationContext): T;
//     /**
//      * Invoke the underlying operation using the given {@code context}.
//      * @param context the context to use to invoke the operation
//      * @param instance instance of the method to invoke.
//      */
//     invoke(context: InvocationContext, instance: object): T;
//     /**
//      * is equals to target or not.
//      * @param target 
//      */
//     equals(target: Invocation): boolean;
// }

// /**
//  * invoker like.
//  * 
//  * 类似执行操作调用的接口
//  */
// export type InvokerLike<T = any> = Invocation<T> | ((ctx: InvocationContext) => T);
