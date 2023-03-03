import { Abstract, OnDestroy, OperationInvoker, ReflectiveRef } from '@tsdi/ioc';


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

  
  abstract onDestroy(): void;

}