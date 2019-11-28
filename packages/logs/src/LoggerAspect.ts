import { Abstract, isFunction, Type, isToken, isObject, ObjectMapProvider, Inject } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';
import { Joinpoint, JoinpointState } from '@tsdi/aop';
import { Level } from './Level';
import { LoggerMetadata } from './decorators/Logger';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { IConfigureLoggerManager } from './IConfigureLoggerManager';
import { ILogFormater, LogFormaterToken } from './LogFormater';
import { ConfigureLoggerManger } from './ConfigureLoggerManger';

/**
 * base looger aspect. for extends your logger aspect.
 *
 * @export
 * @class LoggerAspect
 */
@Abstract()
export abstract class LoggerAspect {

    private _logger: ILogger;
    private _logManger: IConfigureLoggerManager;

    constructor(@Inject(ContainerToken) protected container: IContainer, private config?: LogConfigure | Type<LogConfigure>) {

    }

    get logger(): ILogger {
        if (!this._logger) {
            this._logger = this.logManger.getLogger();
        }
        return this._logger;
    }

    get logManger(): IConfigureLoggerManager {
        if (!this._logManger) {
            this._logManger = this.container.resolve(ConfigureLoggerManger, ObjectMapProvider.parse({ config: this.config }));
        }
        return this._logManger;
    }

    protected processLog(joinPoint: Joinpoint, annotation?: LoggerMetadata[], level?: Level, ...messages: any[]) {
        if (annotation && annotation.length) {
            annotation.forEach(logmeta => {
                let canlog = false;
                if (logmeta.express && logmeta.express(joinPoint)) {
                    canlog = true;
                } else if (!logmeta.express) {
                    canlog = true;
                }
                if (canlog) {
                    this.writeLog(
                        logmeta.logname ? this.logManger.getLogger(logmeta.logname) : this.logger,
                        joinPoint,
                        logmeta.level || level,
                        logmeta.message,
                        ...messages
                    );
                }
            });
        } else {
            this.writeLog(this.logger, joinPoint, level, ...messages);
        }
    }

    protected writeLog(logger: ILogger, joinPoint: Joinpoint, level: Level, ...messages: any[]) {
        (async () => {
            let formatMsgs = this.formatMessage(joinPoint, ...messages);
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

    protected formatMessage(joinPoint: Joinpoint, ...messages: any[]): any[] {
        let config = this.logManger.config;
        let formater: ILogFormater;
        config.format = config.format || LogFormaterToken;
        if (isToken(config.format)) {
            formater = this.container.getService({ token: config.format, target: this, defaultToken: LogFormaterToken });
        } else if (isFunction(config.format)) {
            formater = { format: config.format };
        } else if (isObject(config.format) && isFunction(config.format.format)) {
            formater = config.format;
        }

        if (formater) {
            messages = formater.format(joinPoint, ...messages);
        }

        let timestamp = this.formatTimestamp(formater);
        timestamp && messages.unshift(timestamp);

        return messages;
    }
}
