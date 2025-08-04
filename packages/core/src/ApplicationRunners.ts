import { Abstract, Class, noPointcut, OnDestroy, ProvdierOf, Invocation, StaticProvider, Type, InvocationOptions } from '@tsdi/ioc';
import { CanHandle } from './guard';
import { ApplicationInterceptor } from './ApplicationInterceptor';
import { PipeTransform } from './pipes/pipe';
import { HandlerService } from './handlers/configable';
import { Filter } from './filters/filter';
import { InvocationHandlerOptions } from './invocation';


/**
 * Application runners.
 * 
 * 应用程序运行集合
 */
@Abstract()
export abstract class ApplicationRunners implements HandlerService, OnDestroy {
  static [noPointcut] = true;

  /**
   * runner types size.
   */
  abstract get size(): number;

  /**
   * attach runner
   * @param type 
   */
  abstract attach<T>(type: Type<T> | Class<T>, options: InvocationHandlerOptions<T>): Invocation<T>;

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
   * get Invocation of type.
   * @param type 
   */
  abstract getRef<T>(type: Type<T>, idx?: number): Invocation<T>;
  /**
   * get Invocation of type.
   * @param type 
   */
  abstract getRefs<T>(type: Type<T>): Invocation<T>[];

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
  abstract useGuards(guards: ProvdierOf<CanHandle> | ProvdierOf<CanHandle>[]): this;
  /**
    * use interceptor
    * @param interceptor 
    * @param order 
    */
  abstract useInterceptors(interceptor: ProvdierOf<ApplicationInterceptor> | ProvdierOf<ApplicationInterceptor>[], order?: number): this;
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

