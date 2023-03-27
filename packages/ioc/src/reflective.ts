import { ClassType, Type } from './types';
import { Token } from './tokens';
import { Abstract } from './metadata/fac';
import { Class } from './metadata/type';
import { Destroyable, DestroyCallback, OnDestroy } from './destroy';
import { Injector, MethodType } from './injector';
import { InvocationContext, InvokeArguments } from './context';
import { OperationInvoker } from './operation';



/**
 * type reflectiveRef.
 */
@Abstract()
export abstract class ReflectiveRef<T = any> implements Destroyable, OnDestroy {
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * get the invcation context of target type.
     */
    abstract getContext(): InvocationContext;
    /**
     * get the method invcation context of target type.
     */
    abstract getContext<TArg>(method: string, options?: InvokeArguments<TArg>): InvocationContext;
    /**
     * resolve token in this invcation context.
     */
    abstract resolve<R>(token: Token<R>): R;
    /**
     * target type.
     */
    abstract get type(): Type<T>;
    /**
     * target type class reflective.
     */
    abstract get class(): Class<T>;
    /**
     * get instance T.
     */
    abstract getInstance(): T;
    /**
     * invoke target method.
     * @param method method name.
     * @param option invoke arguments.
     * @param instance target instance.
     */
    abstract invoke<TArg>(method: MethodType<T>, option?: InvokeArguments<TArg>, instance?: T): any;
    /**
     * invoke target method.
     * @param method method name.
     * @param option invoke arguments.
     * @param instance target instance.
     */
    abstract invoke(method: MethodType<T>, context?: InvocationContext, instance?: T): any;
    /**
     * resolve arguments.
     * @param method 
     * @param context 
     */
    abstract resolveArguments(method: MethodType<T>, context?: InvocationContext): any[];
    /**
     * create method invoker of target type.
     * @param method the method name of target.
     * @param options invoker options
     * @returns instance of {@link OperationInvoker}.
     */
    abstract createInvoker<TArg>(method: string, options?: InvokerOptions<T, TArg>): OperationInvoker;
    /**
     * context destroyed or not.
     */
    abstract get destroyed(): boolean;
    /**
     * destroy this.
     */
    abstract destroy(): void | Promise<void>;
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    abstract onDestroy(callback?: DestroyCallback): void | Promise<void>;
}

export interface InvokerOptions<T = any, TArg = any> extends InvokeArguments<TArg> {
    /**
     * instance or instance factory of target type.
     */
    instance?: T | (() => T)
}

/**
 * ReflectiveRef factory.
 */
@Abstract()
export abstract class ReflectiveFactory {
    /**
     * resolve operation factory of target type
     * @param type target type or target type def.
     * @param injector injector.
     * @param option target type invoke option {@link InvokeArguments}
     * @returns instance of {@link ReflectiveRef}
     */
    abstract create<T>(type: ClassType<T> | Class<T>, injector: Injector, option?: InvokeArguments<any>): ReflectiveRef<T>;

    abstract destroy(): void;
}

