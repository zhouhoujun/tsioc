import { JoinPoint } from '@tsdi/aop';
import { Logger } from './logger';
import { LogMetadata } from './metadata';
import { Level } from './Level';
import { LogProcess } from './LogProcess';
import { JoinPointFormater } from './formater';
/**
 * base log aspect. for extends your log aspect.
 *
 * @export
 * @class LogAspect
 */
export declare abstract class LogAspect extends LogProcess {
    processLog(joinPoint: JoinPoint, ...messages: any[]): void;
    processLog(joinPoint: JoinPoint, level: Level, ...messages: any[]): void;
    processLog(joinPoint: JoinPoint, level: Level, ...messages: any[]): void;
    processLog(joinPoint: JoinPoint, annotation: LogMetadata[], ...messages: any[]): void;
    processLog(joinPoint: JoinPoint, annotation: LogMetadata[], level: Level, ...messages: any[]): void;
    protected writeLog(logger: Logger, joinPoint: JoinPoint, level: Level, format: boolean, ...messages: any[]): void;
    protected formatTimestamp(): any;
    private _formater;
    getFormater(): JoinPointFormater | undefined;
    protected formatMessage(joinPoint: JoinPoint, logger: Logger, level: Level, ...messages: any[]): any[];
}
/**
 * Annotation log aspect. log for class or method with @Log decorator.
 *
 * @export
 * @class AnnotationLogAspect
 * @extends {LogAspect}
 */
export declare class AnnotationLogAspect extends LogAspect {
    logging(joinPoint: JoinPoint, annotation: LogMetadata[]): void;
}
