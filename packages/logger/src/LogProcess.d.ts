import { Injector, AbstractType, noPointcut } from '@tsdi/ioc';
import { JoinPoint } from '@tsdi/aop';
import { Logger } from './logger';
import { Level } from './Level';
import { LogMetadata } from './metadata';
import { LoggerManagers } from './manager';
/**
 *  Log process.
 */
export declare abstract class LogProcess {
    static [noPointcut]: boolean;
    logger: Logger;
    mangers: LoggerManagers;
    protected injector: Injector;
    protected getLogger(name?: string, adapter?: string | AbstractType): Logger;
    abstract processLog(joinPoint: JoinPoint, ...messages: any[]): void;
    abstract processLog(joinPoint: JoinPoint, level: Level, ...messages: any[]): void;
    abstract processLog(joinPoint: JoinPoint, annotation: LogMetadata[], ...messages: any[]): void;
    abstract processLog(joinPoint: JoinPoint, annotation: LogMetadata[], level: Level, ...messages: any[]): void;
}
