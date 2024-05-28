import { Abstract, Class, InvocationContext, ModuleRef, OnDestroy, ProvdierOf, ReflectiveRef, StaticProvider, Type } from '@tsdi/ioc';
import { CanActivate } from './guard';
import { Interceptor } from './Interceptor';
import { PipeTransform } from './pipes/pipe';
import { HandlerService } from './handlers/configable';
import { Filter } from './filters/filter';
import { InvocationOptions } from './invocation';

/**
 * Application runners.
 * 
 * 应用程序运行集合
 */
@Abstract()
export abstract class ApplicationRunners implements HandlerService, OnDestroy {

  /**
   * runner types size.
   */
  abstract get size(): number;

  /**
   * attach runner
   * @param type 
   */
  abstract attach<T, TArg>(type: Type<T> | Class<T>, options?: InvocationOptions<TArg>): ReflectiveRef<T>;

  /**
   * detach runner
   * @param type 
   */
  abstract detach<T>(type: Type<T> | Class<T>): void;

  /**
   * has operation or not.
   * @param type 
   */
  abstract has<T>(type: Type<T>): boolean;

  /**
   * get reflectiveRef of type.
   * @param type 
   */
  abstract getRef<T>(type: Type<T>, idx?: number): ReflectiveRef<T>;
  /**
   * get reflectiveRef of type.
   * @param type 
   */
  abstract getRefs<T>(type: Type<T>): ReflectiveRef<T>[]

  /**
   * run all runners.
   */
  abstract run(type?: Type|Type[]): Promise<void>;

  /**
   * stop all runners.
   */
  abstract stop(): Promise<void>;

  /**
   * use pipes.
   * @param guards 
   */
  abstract usePipes(pipes: StaticProvider<PipeTransform> | StaticProvider<PipeTransform>[]): this;

  /**
   * use guards.
   * @param guards 
   */
  abstract useGuards(guards: ProvdierOf<CanActivate> | ProvdierOf<CanActivate>[]): this;
  /**
    * use interceptor
    * @param interceptor 
    * @param order 
    */
  abstract useInterceptors(interceptor: ProvdierOf<Interceptor> | ProvdierOf<Interceptor>[], order?: number): this;
  /**
   * use filter
   * @param filter 
   * @param order 
   */
  abstract useFilters(filter: ProvdierOf<Filter> | ProvdierOf<Filter>[], order?: number): this;

  /**
   * destroy.
   */
  abstract onDestroy(): void;

}


/**
 * Runnable Ref
 */
@Abstract()
export abstract class RunnableRef<T = any> {
  /**
   * type ReflectiveRef
   */
  abstract get typeRef(): ReflectiveRef<T>;
  /**
   * invoke.
   */
  abstract invoke(context: InvocationContext): any;
}

/**
 * Runnable Factory.
 */
@Abstract()
export abstract class RunnableFactory {
  /**
   * runnable factory.
   * @param typeRef 
   */
  abstract create<T>(typeRef: ReflectiveRef<T>, moduleRef?: ModuleRef): RunnableRef<T>
}
