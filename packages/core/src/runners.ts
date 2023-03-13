import { Abstract, InvocationContext, OnDestroy, OperationInvoker, ReflectiveRef, TypeOf } from '@tsdi/ioc';
import { Filter } from './filters';
import { Interceptor } from './Interceptor';

/**
 * Application runner.
 */
@Abstract()
export abstract class ApplicationRunners implements OnDestroy {
  /**
   * attach runner
   * @param runner 
   */
  abstract attach(type: ReflectiveRef): void;
  /**
   * attach runner
   * @param runner 
   */
  abstract attach(runner: OperationInvoker, order?: number): void;

  /**
   * detach runner
   * @param runner 
   */
  abstract detach(runner: OperationInvoker): void;
  /**
   * detach runner
   * @param runner 
   */
  abstract detach(type: ReflectiveRef): void;

  /**
   * has operation or not.
   * @param runner 
   */
  abstract has(runner: ReflectiveRef): boolean;
  /**
   * has operation or not.
   * @param runner 
   */
  abstract has(runner: OperationInvoker): boolean;
  /**
   * run all runners.
   */
  abstract run(context: InvocationContext): Promise<void>;

  /**
   * stop all runners.
   */
  abstract stop(): Promise<void>;

  /**
    * use interceptor
    * @param interceptor 
    * @param order 
    */
  abstract useInterceptor(interceptor: TypeOf<Interceptor>, order?: number): this;
  /**
   * use filter
   * @param filter 
   * @param order 
   */
  abstract useFilter(filter: TypeOf<Filter>, order?: number): this;


  /**
   * destroy.
   */
  abstract onDestroy(): void;

}


/**
 * Runnable
 */
@Abstract()
export abstract class Runnable<T = any> {
  /**
   * type ReflectiveRef
   */
  abstract get typeRef(): ReflectiveRef<T>;
  /**
   * invoke.
   */
  abstract invoke(): any;
}

