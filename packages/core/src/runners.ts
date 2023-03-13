import { Abstract, OnDestroy, OperationInvoker, ReflectiveRef } from '@tsdi/ioc';

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
  abstract run(): Promise<void>;

  /**
   * stop all runners.
   */
  abstract stop(): Promise<void>;

  /**
   * destroy.
   */
  abstract onDestroy(): void;

}


/**
 * Runnable
 */
@Abstract()
export abstract class Runnable<T> {
  /**
   * type ReflectiveRef
   */
  abstract get typeRef(): ReflectiveRef<T>;
  /**
   * invoke.
   */
  abstract invoke(): any;
}

