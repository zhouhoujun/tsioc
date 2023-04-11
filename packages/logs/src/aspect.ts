import { Abstract, isFunction, isToken, isObject, isArray, isNil, EMPTY_OBJ } from '@tsdi/ioc';
import { Aspect, Joinpoint, JoinpointState, Pointcut } from '@tsdi/aop';
import { Logger } from './logger';
import { LogMetadata } from './metadata';
import { isLevel, Level } from './Level';
import { LogProcess } from './LogProcess';
import { JoinpointFormater, DefaultJoinpointFormater } from './formater';
import { LogConfigure } from './LogConfigure';

/**
 * base log aspect. for extends your log aspect.
 *
 * @export
 * @class LogAspect
 */
@Abstract()
export abstract class LogAspect extends LogProcess {

    processLog(joinPoint: Joinpoint, ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, annotation: LogMetadata[], ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, annotation: LogMetadata[], level: Level, ...messages: any[]): void
    processLog(joinPoint: Joinpoint, annotation: any, level: any, ...messages: any[]): void {
        if (isArray(annotation)) {
            if (!isLevel(level)) {
                !isNil(level) && messages.unshift(level)
            }
            annotation.forEach((logmeta: LogMetadata) => {
                const canlog = logmeta.express ? logmeta.express(joinPoint) : true;
                if (canlog && logmeta.message) {
                    this.writeLog(
                        this.getLogger(logmeta.logname),
                        joinPoint,
                        logmeta.level || level,
                        false,
                        logmeta.message
                    )
                }
            });
            this.writeLog(this.logger, joinPoint, level, true, ...messages)
        } else {
            !isNil(level) && messages.unshift(level);
            if (isLevel(annotation)) {
                level = annotation
            } else {
                level = '';
                !isNil(annotation) && messages.unshift(annotation)
            }
            this.writeLog(this.logger, joinPoint, level, true, ...messages)
        }
    }

    protected writeLog(logger: Logger, joinPoint: Joinpoint, level: Level, format: boolean, ...messages: any[]) {
        (async () => {
            const formatMsgs = format ? this.formatMessage(joinPoint, logger, level, ...messages) : messages;
            if (level) {
                logger[level](...formatMsgs)
            } else {
                switch (joinPoint.state) {
                    case JoinpointState.Before:
                    case JoinpointState.After:
                    case JoinpointState.AfterReturning:
                        logger.debug(...formatMsgs);
                        break;
                    case JoinpointState.Pointcut:
                        logger.info(...formatMsgs);
                        break;

                    case JoinpointState.AfterThrowing:
                        logger.error(...formatMsgs);
                        break;
                }
            }
        })()
    }

    protected formatTimestamp(): any {
        const now = new Date();
        return `[${now.toISOString()}]`
    }

    private _formater: JoinpointFormater | undefined;
    getFormater() {
        if (!this._formater) {
            const config = this.mangers.getConfigure() || (EMPTY_OBJ as LogConfigure);
            let formater: JoinpointFormater | undefined;
            const format = config.format || JoinpointFormater;
            if (isToken(format)) {
                formater = this.injector.get(format, null) ?? this.injector.get(DefaultJoinpointFormater)
            } else if (isFunction(format)) {
                formater = { format } as JoinpointFormater
            } else if (isObject(format) && isFunction(format.format)) {
                formater = format
            }
            this._formater = formater
        }
        return this._formater
    }

    protected formatMessage(joinPoint: Joinpoint, logger: Logger, level: Level, ...messages: any[]): any[] {
        const formater = this.getFormater();
        if (formater) {
            messages = formater.format(joinPoint, level, logger, ...messages)
        } else {
            messages.unshift((logger.category ?? 'default') + ' -')
            if (level) {
                messages.unshift(`[${level.toUpperCase()}]`)
            }
            const timestamp = this.formatTimestamp();
            if (timestamp) messages.unshift(timestamp)
        }

        return messages
    }
}


/**
 * Annotation log aspect. log for class or method with @Log decorator.
 *
 * @export
 * @class AnnotationLogAspect
 * @extends {LogAspect}
 */
@Aspect({ static: true })
export class AnnotationLogAspect extends LogAspect {

    @Pointcut('@annotation(Log)', 'annotation')
    logging(joinPoint: Joinpoint, annotation: LogMetadata[]) {
        this.processLog(joinPoint, annotation)
    }
}
