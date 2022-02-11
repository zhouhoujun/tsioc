import { Abstract } from '@tsdi/ioc';


/**
 * application arguments.
 */
@Abstract()
export abstract class ApplicationArguments implements Record<string, any> {
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
     * @param args the args reset with.
     */
    abstract reset(args: string[]): void;
}
