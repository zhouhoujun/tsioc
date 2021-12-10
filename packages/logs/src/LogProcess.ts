import { Abstract, Injector, Inject } from '@tsdi/ioc';
import { Joinpoint } from '@tsdi/aop';
import { Level } from './Level';
import { Logger, LoggerMetadata } from './metadata/Logger';
import { ILogger } from './ILogger';
import { ConfigureLoggerManager } from './manager';
import { LoggerManager } from './LoggerManager';



/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {
    static ρNPT = true;
    
    @Logger() logger!: ILogger;
    @Inject(ConfigureLoggerManager) logManger!: LoggerManager;
    @Inject() protected injector!: Injector

    protected getLogger(): ILogger {
        return this.logManger.getLogger();
    }

    abstract processLog(joinPoint: Joinpoint, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], ...messages: any[]): void;
    abstract processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], level: Level, ...messages: any[]): void;
}
