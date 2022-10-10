import { ClassType, Type } from './types';
import { Token } from './tokens';
import { Abstract } from './metadata/fac';
import { TypeReflect } from './metadata/type';
import { Destroyable, DestroyCallback, OnDestroy } from './destroy';
import { Injector, MethodType } from './injector';
import { InvocationContext, InvocationOption, InvokeArguments, InvokeOption } from './context';
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
      * instance of this target type.
      */
     abstract resolve(): T;
     /**
      * resolve token in this invcation context.
      */
     abstract resolve<R>(token: Token<R>): R;
     /**
      * target reflect.
      */
     abstract get reflect(): TypeReflect<T>;
     /**
      * target type.
      */
     abstract get type(): Type<T>;
     /**
      * the invcation context of target type.
      */
     abstract get context(): InvocationContext;
     /**
      * invoke target method.
      * @param method method name.
      * @param option invoke arguments.
      * @param instance target instance.
      */
     abstract invoke(method: MethodType<T>, option?: InvokeOption, instance?: T): any;
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
      * @param instance instance of target type.
      * @returns instance of {@link OperationInvoker}.
      */
     abstract createInvoker(method: string, instance?: T): OperationInvoker;
     /**
      * create invocation context of target.
      * @param option ext option. type of {@link InvocationOption}.
      * @returns instance of {@link InvocationContext}.
      */
     abstract createContext(option?: InvocationOption): InvocationContext;
     /**
      * create invocation context of target.
      * @param injector to resolver the type. type of {@link Injector}.
      * @param option ext option. type of {@link InvocationOption}.
      * @returns instance of {@link InvocationContext}.
      */
     abstract createContext(injector: Injector, option?: InvocationOption): InvocationContext;
     /**
      * create invocation context of target.
      * @param parant parent invocation context. type of {@link InvocationContext}.
      * @param option ext option. type of {@link InvocationOption}.
      * @returns instance of {@link InvocationContext}.
      */
     abstract createContext(parant: InvocationContext, option?: InvocationOption): InvocationContext;
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
 

 /**
  * ReflectiveRef resolver.
  */
 @Abstract()
 export abstract class ReflectiveResolver {
     /**
      * resolve operation factory of target type
      * @param type target type or target type reflect.
      * @param injector injector.
      * @param option target type invoke option {@link InvokeArguments}
      * @returns instance of {@link ReflectiveRef}
      */
     abstract resolve<T>(type: ClassType<T> | TypeReflect<T>, injector: Injector, option?: InvokeArguments): ReflectiveRef<T>;
 }
 
 