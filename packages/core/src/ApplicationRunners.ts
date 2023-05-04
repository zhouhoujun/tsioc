import { Abstract, Class, InvocationContext, OnDestroy, ProvdierOf, ReflectiveRef, StaticProvider, Type } from '@tsdi/ioc';
import { CanActivate } from './guard';
import { Interceptor } from './Interceptor';
import { Filter } from './filters/filter';
import { PipeTransform } from './pipes/pipe';
import { EndpointOptions, EndpointService } from './endpoints/endpoint.service';

/**
 * Application runners.
 * 
 * 应用程序运行集合
 */
@Abstract()
export abstract class ApplicationRunners implements EndpointService, OnDestroy {

  /**
   * runner types size.
   */
  abstract get size(): number;

  /**
   * attach runner
   * @param type 
   */
  abstract attach<T, TArg>(type: Type<T> | Class<T>, options?: EndpointOptions<TArg>): ReflectiveRef<T>;

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
  abstract getRef<T>(type: Type<T>): ReflectiveRef<T>;

  /**
   * run all runners.
   */
  abstract run(type?: Type): Promise<void>;

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

