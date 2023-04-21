import { Abstract, Injector, Inject, Type } from '@tsdi/ioc';
import { Joinpoint } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';
import { Log, LogMetadata } from './metadata';
import { LoggerManagers } from './manager';



/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {
    static ƿNPT = true;

    @Log() logger!: Logger;
    @Inject() mangers!: LoggerManagers;
    @Inject() protected injector!: Injector

    protected getLogger(name?: string, adapter?: string| Type): Logger {
        return name ? this.mangers.getLogger(name, adapter) : this.logger
    }

    abstract processLog(joinPoint: Joinpoint, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LogMetadata[], ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LogMetadata[], level: Level, ...messages: any[]): void;
}
