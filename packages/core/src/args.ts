import { Abstract } from '@tsdi/ioc';


 /**
  * application arguments.
  */
 @Abstract()
 export abstract class ApplicationArguments {
     /**
      * process args source
      */
     abstract get argsSource(): string[];
     /**
      * process args map.
      */
     abstract get args(): Record<string, string>;
     /**
      * process args command.
      */
     abstract get cmds(): string[];
     /**
      * process env
      */
     abstract get env(): Record<string, string | undefined>;
     /**
      * process exit signls.
      */
     abstract get signls(): string[];
     /**
      * reset args.
      * @param args 
      */
     abstract reset(args: string[]): void;
 }
 