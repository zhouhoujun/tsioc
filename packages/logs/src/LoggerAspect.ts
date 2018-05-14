import { Level } from './Level';
import { Aspect, Joinpoint, JoinpointState, Pointcut } from '@ts-ioc/aop';
import { IContainer, Singleton, Inject, Abstract, isFunction, Type, isString } from '@ts-ioc/core';

import { LoggerMetadata } from './decorators/Logger';
import { LogConfigure } from './LogConfigure';
import { ILogger } from './ILogger';
import { ILoggerManger } from './ILoggerManger';
import { LogSymbols } from './symbols';
import { IConfigureLoggerManager } from './IConfigureLoggerManager';

/**
 * base looger aspect. for extends your logger aspect.
 *
 * @export
 * @class LoggerAspect
 */
export class LoggerAspect {

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
            this._logManger = this.container.resolve<IConfigureLoggerManager>(LogSymbols.IConfigureLoggerManager, { config: this.config });
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
        return messgs.filter(a => a).map(a => isString(a) ? a : a.toString()).join(', ');
    }

    protected writeLog(logger: ILogger, joinPoint: Joinpoint, message?: string, level?: Level) {

        let config = this.logManger.config;
        let isCustom = isFunction(config.customFormat);

        if (isCustom) {
            config.customFormat(joinPoint, logger, message, level);
        } else {
            let formatStr = this.joinMessage(isFunction(config.format) ? config.format(joinPoint, logger) : '', message);

            let formatArgs = isFunction(config.formatArgs) ? config.formatArgs(joinPoint, logger) : [];
            if (level) {
                logger[level](formatStr, ...formatArgs);
            } else {
                switch (joinPoint.state) {
                    case JoinpointState.Before:
                    case JoinpointState.After:
                    case JoinpointState.AfterReturning:
                        logger.debug(formatStr, ...formatArgs);
                        break;
                    case JoinpointState.Pointcut:
                        logger.info(formatStr, ...formatArgs);
                        break;

                    case JoinpointState.AfterThrowing:
                        logger.error(formatStr, ...formatArgs);
                        break;

                }
            }
        }
    }
}
