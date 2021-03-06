import { Abstract, isFunction, isToken, isObject, isArray, isString, isDefined, Singleton } from '@tsdi/ioc';
import { Aspect, Joinpoint, JoinpointState, Pointcut } from '@tsdi/aop';
import { LoggerMetadata } from './decorators/Logger';
import { Level } from './Level';
import { ILogger } from './ILogger';
import { LogProcess } from './LogProcess';
import { ILogFormater, LogFormaterToken } from './formater';
import { IConfigureLoggerManager } from './ILoggerManager';
import { LogConfigure } from './LogConfigure';

/**
 * base looger aspect. for extends your logger aspect.
 *
 * @export
 * @class LoggerAspect
 */
@Abstract()
export abstract class LoggerAspect extends LogProcess {

    processLog(joinPoint: Joinpoint, ...messages: any[]);
    processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]);
    processLog(joinPoint: Joinpoint, level: Level, ...messages: any[]);
    processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], ...messages: any[]);
    processLog(joinPoint: Joinpoint, annotation: LoggerMetadata[], level: Level, ...messages: any[])
    processLog(joinPoint: Joinpoint, annotation: any, level: any, ...messages: any[]) {
        if (isArray(annotation)) {
            if (!(isString(level) && Level[level])) {
                isDefined(level) && messages.unshift(level);
            }
            annotation.forEach((logmeta: LoggerMetadata) => {
                let canlog = false;
                if (logmeta.express && logmeta.express(joinPoint)) {
                    canlog = true;
                } else if (!logmeta.express) {
                    canlog = true;
                }
                if (canlog && logmeta.message) {
                    this.writeLog(
                        logmeta.logname ? this.logManger.getLogger(logmeta.logname) : this.logger,
                        joinPoint,
                        logmeta.level || level,
                        false,
                        logmeta.message
                    );
                }
            });
            this.writeLog(this.logger, joinPoint, level, true, ...messages);
        } else {
            isDefined(level) && messages.unshift(level);
            if (isString(annotation) && Level[annotation]) {
                level = annotation;
            } else {
                level = '';
                isDefined(annotation) && messages.unshift(annotation);
            }
            this.writeLog(this.logger, joinPoint, level, true, ...messages);
        }
    }

    protected writeLog(logger: ILogger, joinPoint: Joinpoint, level: Level, format: boolean, ...messages: any[]) {
        (async () => {
            let formatMsgs = format ? this.formatMessage(joinPoint, ...messages) : messages;
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

    protected formatTimestamp(formater: ILogFormater): any {
        let now = new Date();
        return (formater && formater.timestamp) ? formater.timestamp(now) : `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()} ${now.getMilliseconds()}`;
    }

    _formater: ILogFormater;
    getFormater() {
        if (!this._formater) {
            let config = (this.logManger as IConfigureLoggerManager).config || ({} as LogConfigure);
            let formater: ILogFormater;
            config.format = config.format || LogFormaterToken;
            if (isToken(config.format)) {
                formater = this.injector.getService({ token: config.format, target: this, defaultToken: LogFormaterToken });
            } else if (isFunction(config.format)) {
                formater = { format: config.format };
            } else if (isObject(config.format) && isFunction(config.format.format)) {
                formater = config.format;
            }
            this._formater = formater;
        }
        return this._formater;
    }

    protected formatMessage(joinPoint: Joinpoint, ...messages: any[]): any[] {
        let formater = this.getFormater();
        if (formater) {
            messages = formater.format(joinPoint, ...messages);
        }

        let timestamp = this.formatTimestamp(formater);
        timestamp && messages.unshift(timestamp);

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
