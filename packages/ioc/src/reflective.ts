import { ClassType, Type } from './types';
import { Token } from './tokens';
import { Abstract } from './metadata/fac';
import { Class } from './metadata/type';
import { Destroyable, DestroyCallback, OnDestroy } from './destroy';
import { Injector, MethodType } from './injector';
import { InvocationContext, InvokeArguments } from './context';
import { OperationInvoker } from './operation';



/**
 * type reflective.
 * 
 * 类反射
 */
@Abstract()
export abstract class ReflectiveRef<T = any> implements Destroyable, OnDestroy {
    /**
     * injector.
     * 
     * 当前类注入的容器
     */
    abstract get injector(): Injector;
    /**
     * get the invcation context of target type.
     * 
     * 当前类的上下文环境
     */
    abstract getContext(): InvocationContext;
    /**
     * get the method invcation context of target type.
     * 
     * 获取当前类方法的上下文环境
     */
    abstract getContext<TArg>(method: string, options?: InvokeArguments<TArg>): InvocationContext;
    /**
     * resolve token in this invcation context.
     * 
     * 根据当前类的上下文环境解析该标记令牌的实例对象
     */
    abstract resolve<R>(token: Token<R>): R;
    /**
     * target type.
     * 
     * 反射类
     */
    abstract get type(): Type<T>;
    /**
     * target type class reflective.
     * 
     * 反射类类结构
     */
    abstract get class(): Class<T>;
    /**
     * get instance T.
     * 
     * 反射类实例
     */
    abstract getInstance(): T;
    /**
     * invoke target method.
     * 
     * 调用反射类方法
     * 
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
     * 
     * 解析类方法的所有参数实例。
     * 
     * @param method 类方法
     * @param context 用户自定义上下文， 默认使用该方法的默认上下文环境
     */
    abstract resolveArguments(method: MethodType<T>, context?: InvocationContext): any[];
    /**
     * create method invoker of target type.
     * 
     * 创建执行操作调用的接口。
     * 
     * @param method the method name of target.
     * @param options invoker options
     * @returns instance of {@link OperationInvoker}.
     */
    abstract createInvoker<TArg>(method: string, options?: InvokerOptions<T, TArg>): OperationInvoker;
    /**
     * destroyed or not.
     * 
     * 类反射销毁与否
     */
    abstract get destroyed(): boolean;
    /**
     * destroy this.
     * 
     * 销毁当前类反射
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

