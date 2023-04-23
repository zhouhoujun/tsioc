import { ClassType } from './types';
import { InvocationContext } from './context';
import { Observable } from 'rxjs';
import { ReflectiveRef } from './reflective';


/**
 * asyc like
 * 
 * 异步数据
 */
export type AsyncLike<T> = T | Promise<T> | Observable<T>;


/**
 * Interface to perform an operation invocation.
 * 
 * 用于执行操作调用的接口。
 */
export interface OperationInvoker<T = any> {
    /**
     * type ref.
     * 
     * 类反射
     */
    get typeRef(): ReflectiveRef;

    /**
     * `InvocationContext` of operation method
     * 
     * 调用类方法的上下文环境
     */
    get context(): InvocationContext;
    /**
     * invoker order.
     * 
     * 调用方法顺序
     */
    order?: number;
    /**
     * method return type.
     */
    get returnType(): ClassType;
    /**
     * invoke method name
     * 
     * 调用类方法名称
     */
    get method(): string;
    /**
     * origin method descriptor.
     * 
     * 类方法描述符
     */
    get descriptor(): TypedPropertyDescriptor<T>;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     */
    invoke(context: InvocationContext): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param instance instance of the method to invoke.
     */
    invoke(context: InvocationContext, instance: object): T;
    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(): any[];
    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[];
    /**
     * is equals to target or not.
     * @param target 
     */
    equals(target: OperationInvoker): boolean;
}

/**
 * invoker like.
 * 
 * 类似执行操作调用的接口
 */
export type InvokerLike<T = any> = OperationInvoker<T> | ((ctx: InvocationContext) => T);
