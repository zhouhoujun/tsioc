import { Abstract, OnDestroy, OperationInvoker, ReflectiveRef, Type } from '@tsdi/ioc';

// /**
//  * application runners. for runners run in step.
//  */
// @Abstract()
// export abstract class ApplicationRunners {
//   /**
//    * get startup runners.
//    */
//   abstract get startups(): RunnableSet<Startup>;
//   /**
//    * get configure service runners.
//    */
//   abstract get services(): RunnableSet<ConfigureService>;
//   /**
//    * get runnable runners.
//    */
//   abstract get runnables(): RunnableSet;
//   /**
//    * bootstrap runners of application main module.
//    */
//   abstract get bootstraps(): RunnableRef[];
//   /**
//    * all attached runners of application.
//    */
//   abstract get runners(): RunnableRef[];
//   /**
//    * add runner.
//    * @param runner runn
//    * @param order order to run. 
//    */
//   abstract addRunnable(runner: RunnableRef, order?: number): void;
//   /**
//    * add startup runner.
//    * @param runner startup runner.
//    * @param order order to run.
//    */
//   abstract addStartup(runner: RunnableRef<Startup>, order?: number): void;
//   /**
//    * add configure service runner.
//    * @param runner configure service runner.
//    * @param order order to run.
//    */
//   abstract addConfigureService(runner: RunnableRef<ConfigureService>, order?: number): void;
//   /**
//    * add bootstrap runner.
//    * @param runner 
//    */
//   abstract addBootstrap(runner: RunnableRef): void;
//   /**
//    * attach application runner.
//    * @param runner 
//    */
//   abstract attach(runner: RunnableRef): void;
//   /**
//    * run all runners.
//    */
//   abstract run(): Promise<void>;
//   /**
//    * destroy this.
//    */
//   abstract onDestroy(): void

// }


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