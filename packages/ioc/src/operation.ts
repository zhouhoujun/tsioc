import { Observable } from 'rxjs';
// import { Type } from './types';
import { InvocationContext, InvokeArguments, InvokeParentContext } from './context';
// import { ReflectiveRef } from './reflective';
import { Class } from './metadata/class';
import { Type } from './types';
import { MethodType } from './injector';


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
export abstract class InvocationInvoker<T = any, TRes = any> {
    /**
     * the invoke type.
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
     * `InvocationContext` of Invocation invoker.
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
    abstract equals(target: InvocationInvoker): boolean;
}


export interface InvokerOptions<T = any, TArg = any> extends InvokeParentContext, InvokeArguments<TArg> {
    /**
     * instance or instance factory of target type.
     */
    instance?: T | (() => T);
     /**
     * named of invocation target propertyKey.
     */
     propertyKey?: string|symbol;
}

export interface MethodInvokerOptions<T = any, TArg = any> extends InvokerOptions<T> {
    /**
     * named of invocation target propertyKey.
     */
    propertyKey: string|symbol;
}

/**
 * Invocation factory.
 *
 * 用于创建执行操作调用的接口。
 */
export abstract class InvocationFactory<T = any> {
    abstract create(type: Type<T> | Class<T>, options: InvokerOptions): InvocationInvoker;
}



// /**
//  * Interface to perform an operation invocation.
//  * 
//  * 用于执行操作调用的接口。
//  */
// export interface OperationInvoker<T = any> {
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
//     equals(target: OperationInvoker): boolean;
// }

// /**
//  * invoker like.
//  * 
//  * 类似执行操作调用的接口
//  */
// export type InvokerLike<T = any> = OperationInvoker<T> | ((ctx: InvocationContext) => T);
