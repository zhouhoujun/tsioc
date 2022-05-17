import { Abstract, Injector, Inject } from '@tsdi/ioc';
import { Joinpoint } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';
import { Log, LogMetadata } from './metadata/log';
import { ConfigureLoggerManager } from './manager';
import { LoggerManager } from './LoggerManager';



/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {
    static ƿNPT = true;

    @Log() logger!: Logger;
    @Inject(ConfigureLoggerManager) logManger!: LoggerManager;
    @Inject() protected injector!: Injector

    protected getLogger(name?: string): Logger {
        return name ? this.logManger.getLogger(name) : this.logger
    }

    abstract processLog(joinPoint: Joinpoint, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LogMetadata[], ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LogMetadata[], level: Level, ...messages: any[]): void;
}
