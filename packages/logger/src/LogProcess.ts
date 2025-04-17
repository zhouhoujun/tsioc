import { Abstract, Injector, Inject, Type, noPointcut } from '@tsdi/ioc';
import { JoinPoint } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';
import { InjectLog, LogMetadata } from './metadata';
import { LoggerManagers } from './manager';



/**
 *  Log process.
 */
@Abstract()
export abstract class LogProcess {
    static [noPointcut] = true;

    @InjectLog() logger!: Logger;
    @Inject() mangers!: LoggerManagers;
    @Inject() protected injector!: Injector

    protected getLogger(name?: string, adapter?: string| Type): Logger {
        return name ? this.mangers.getLogger(name, adapter) : this.logger
    }

    abstract processLog(joinPoint: JoinPoint, ...messages: any[]): void;
    abstract processLog(joinPoint: JoinPoint, level: Level, ...messages: any[]): void;
    abstract processLog(joinPoint: JoinPoint, annotation: LogMetadata[], ...messages: any[]): void;
    abstract processLog(joinPoint: JoinPoint, annotation: LogMetadata[], level: Level, ...messages: any[]): void;
}
