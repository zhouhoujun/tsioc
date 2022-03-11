import { Abstract, isFunction, isToken, isObject, isArray, Singleton, isNil, EMPTY_OBJ } from '@tsdi/ioc';
import { Aspect, Joinpoint, JoinpointState, Pointcut } from '@tsdi/aop';
import { ILogger } from '@tsdi/core';
import { LoggerMetadata } from './metadata/Logger';
import { isLevel, Level } from './Level';
import { LogProcess } from './LogProcess';
import { LogFormater, DefaultLogFormater } from './formater';
import { LogConfigure } from './LogConfigure';
import { ConfigureLoggerManager } from './manager';

/**
 * base looger aspect. for extends your logger aspect.
 *
 * @export
 * @class LoggerAspect
 */
@Abstract()
export abstract class LoggerAspect extends LogProcess {

    processLog(joinPoint: Joinpoint, ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], ...messages: any[]): void;
    processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], level: Level, ...messages: any[]): void
    processLog(joinPoint: Joinpoint, annotation: any, level: any, ...messages: any[]): void {
        if (isArray(annotation)) {
            if (!isLevel(level)) {
                !isNil(level) && messages.unshift(level);
            }
            annotation.forEach((logmeta: LoggerMetadata) => {
                let canlog = logmeta.express ? logmeta.express(joinPoint) : true;
                if (canlog && logmeta.message) {
                    this.writeLog(
                        this.getLogger(logmeta.logname),
                        joinPoint,
                        logmeta.level || level,
                        false,
                        logmeta.message
                    );
                }
            });
            this.writeLog(this.logger, joinPoint, level, true, ...messages);
        } else {
            !isNil(level) && messages.unshift(level);
            if (isLevel(annotation)) {
                level = annotation;
            } else {
                level = '';
                !isNil(annotation) && messages.unshift(annotation);
            }
            this.writeLog(this.logger, joinPoint, level, true, ...messages);
        }
    }

    protected writeLog(logger: ILogger, joinPoint: Joinpoint, level: Level, format: boolean, ...messages: any[]) {
        (async () => {
            let formatMsgs = format ? this.formatMessage(joinPoint, logger, level, ...messages) : messages;
            if (level) {
                logger[level](...formatMsgs);
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
        })();
    }

    protected formatTimestamp(): any {
        let now = new Date();
        return `[${now.toISOString()}]`;
    }

    private _formater: LogFormater | undefined;
    getFormater() {
        if (!this._formater) {
            let config = (this.logManger as ConfigureLoggerManager).config || (EMPTY_OBJ as LogConfigure);
            let formater: LogFormater | undefined;
            const format = config.format || LogFormater;
            if (isToken(format)) {
                formater = this.injector.resolve({ token: format, target: this, defaultToken: DefaultLogFormater });
            } else if (isFunction(format)) {
                formater = { format } as LogFormater;
            } else if (isObject(format) && isFunction(format.format)) {
                formater = format;
            }
            this._formater = formater;
        }
        return this._formater;
    }

    protected formatMessage(joinPoint: Joinpoint, logger: ILogger, level: Level, ...messages: any[]): any[] {
        let formater = this.getFormater();
        if (formater) {
            messages = formater.format(joinPoint, level, logger, ...messages);
        } else {
            messages.unshift((logger.name ?? 'default') + ' -')
            if (level) {
                messages.unshift(`[${level.toUpperCase()}]`)
            }
            let timestamp = this.formatTimestamp();
            if (timestamp) messages.unshift(timestamp);
        }

        return messages;
    }
}


/**
 * Annotation logger aspect. log for class or method with @Logger decorator.
 *
 * @export
 * @class AnnotationLogerAspect
 * @extends {LoggerAspect}
 */
@Singleton()
@Aspect()
export class AnnotationLoggerAspect extends LoggerAspect {

    @Pointcut('@annotation(Logger)', 'annotation')
    logging(joinPoint: Joinpoint, annotation: LoggerMetadata[]) {
        this.processLog(joinPoint, annotation);
    }
}
