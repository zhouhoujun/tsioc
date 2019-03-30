import { Level } from './Level';
import { Joinpoint, JoinpointState } from '@tsdi/aop';
import { IContainer } from '@tsdi/core';
import { Abstract, isFunction, Type, isToken, isString, isObject, lang, ObjectMapProvider } from '@tsdi/ioc'
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

    constructor(protected container: IContainer, private config?: LogConfigure | Type<LogConfigure>) {

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

    protected processLog(joinPoint: Joinpoint, annotation?: LoggerMetadata[], message?: string, level?: Level) {
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
                        this.joinMessage(message, logmeta.message),
                        logmeta.level || level);
                }
            });
        } else {
            this.writeLog(this.logger, joinPoint, message, level);
        }
    }


    protected joinMessage(...messgs: any[]) {
        return messgs.filter(a => a).map(a => isString(a) ? a : a.toString()).join('; ');
    }

    protected writeLog(logger: ILogger, joinPoint: Joinpoint, message?: string, level?: Level) {

        let formatStr = this.formatMessage(joinPoint, message);

        if (level) {
            logger[level](formatStr);
        } else {
            switch (joinPoint.state) {
                case JoinpointState.Before:
                case JoinpointState.After:
                case JoinpointState.AfterReturning:
                    logger.debug(formatStr);
                    break;
                case JoinpointState.Pointcut:
                    logger.info(formatStr);
                    break;

                case JoinpointState.AfterThrowing:
                    logger.error(formatStr);
                    break;

            }
        }

    }

    protected formatMessage(joinPoint: Joinpoint, message?: string) {
        let config = this.logManger.config;
        let formater: ILogFormater;
        config.format = config.format || LogFormaterToken;
        if (isToken(config.format)) {
            formater = this.container.getService(config.format, lang.getClass(this));
        } else if (isFunction(config.format)) {
            formater = { format: config.format };
        } else if (isObject(config.format) && isFunction(config.format.format)) {
            formater = config.format;
        }

        if (formater) {
            return formater.format(joinPoint, message);
        }

        return '';
    }
}
