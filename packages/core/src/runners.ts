import { Abstract } from '@tsdi/ioc';
import { RunnableRef, RunnableSet } from './runnable';
import { ConfigureService } from './service';
import { Startup } from './startup';

/**
 * application runners. for runners run in step.
 */
 @Abstract()
 export abstract class ApplicationRunners {
     /**
      * get startup runners.
      */
     abstract get startups(): RunnableSet<Startup>;
     /**
      * get configure service runners.
      */
     abstract get services(): RunnableSet<ConfigureService>;
     /**
      * get runnable runners.
      */
     abstract get runnables(): RunnableSet;
     /**
      * bootstrap runners of application main module.
      */
     abstract get bootstraps(): RunnableRef[];
     /**
      * all attached runners of application.
      */
     abstract get runners(): RunnableRef[];
     /**
      * add runner.
      * @param runner runn
      * @param order order to run. 
      */
     abstract addRunnable(runner: RunnableRef, order?: number): void;
     /**
      * add startup runner.
      * @param runner startup runner.
      * @param order order to run.
      */
     abstract addStartup(runner: RunnableRef<Startup>, order?: number): void;
     /**
      * add configure service runner.
      * @param runner configure service runner.
      * @param order order to run.
      */
     abstract addConfigureService(runner: RunnableRef<ConfigureService>, order?: number): void;
     /**
      * add bootstrap runner.
      * @param runner 
      */
     abstract addBootstrap(runner: RunnableRef): void;
     /**
      * attach application runner.
      * @param runner 
      */
     abstract attach(runner: RunnableRef): void;
     /**
      * run all runners.
      */
     abstract run(): Promise<void>;
     /**
       * destroy this.
       */
     abstract onDestroy(): void
 
 }
 