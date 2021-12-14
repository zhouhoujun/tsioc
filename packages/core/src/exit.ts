import { Abstract } from '@tsdi/ioc';

/**
 * application exit.
 */
 @Abstract()
 export abstract class ApplicationExit {
     /**
      * register application process signls
      */
     abstract register(): void;
 }
 