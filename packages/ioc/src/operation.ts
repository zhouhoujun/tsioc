import { ClassType } from './types';
import { InvocationContext } from './context';
import { Observable } from 'rxjs';


export type AsyncLike<T> = T | Promise<T> | Observable<T>;


/**
 * Interface to perform an operation invocation.
 */
export interface OperationInvoker<T = any> {
    /**
     * invoker order.
     */
    order?: number;
    /**
     * method return type.
     */
    get returnType(): ClassType;
    /**
     * origin method descriptor.
     */
    get descriptor(): TypedPropertyDescriptor<T>;
    // /**
    //  * before invoke.
    //  * @param hook 
    //  */
    // before(hook: (context: InvocationContext, args: any[]) => AsyncLike<void | any[]>): void;
    // /**
    //  * after invoke.
    //  * @param hook 
    //  */
    // after(hook: (context: InvocationContext, returnning: T) => AsyncLike<void>): void;
    // /**
    //  * after returning hooks.
    //  */
    // afterReturnning(hook: (context: InvocationContext, returnning: T) => AsyncLike<any>): void;
    // /**
    //  * after throwing hooks.
    //  */
    // afterThrowing(hook: (context: InvocationContext, throwing: Error) => AsyncLike<void>): void;
    // /**
    //  * finally hooks.
    //  */
    // finally(hook: (context: InvocationContext) => AsyncLike<void>): void;

    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, proceed?: Proceed<T>): T;
    /**
     * Invoke the underlying operation using the given {@code context}.
     * @param context the context to use to invoke the operation
     * @param instance instance of the method to invoke.
     * @param proceed proceed invoke with hooks
     */
    invoke(context: InvocationContext, instance: object, proceed?: Proceed<T>): T;
    /**
     * resolve args. 
     * @param context 
     */
    resolveArguments(context: InvocationContext): any[];
}


export type Proceed<T = any> = (ctx: InvocationContext, args: any[], runnable: (args: any[]) => T) => T;