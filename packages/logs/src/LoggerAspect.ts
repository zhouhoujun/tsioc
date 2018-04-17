import { Aspect, Joinpoint, JoinpointState, Pointcut } from '@ts-ioc/aop';
import { IContainer, Singleton, Inject, Abstract, isFunction } from '@ts-ioc/core';

import { LoggerMetadata } from './decorators/Logger';
import { LogConfigure } from './LogConfigure';
import { DefaultLogConfigure } from './DefaultLogConfigure';
import { ILogger } from './ILogger';
import { ILoggerManger } from './ILoggerManger';
import { LogSymbols } from './symbols';

export class LoggerAspect {

    private _logger: ILogger;
    private _logManger: ILoggerManger;
    private _config: LogConfigure;
    constructor(protected container: IContainer, config?: LogConfigure) {
        this._config = config;
    }

    get config(): LogConfigure {
        if (!this._config) {
            if (!this.container.has(LogSymbols.LogConfigure)) {
                this.container.register(DefaultLogConfigure);
            }
            this._config = this.container.resolve<LogConfigure>(LogSymbols.LogConfigure);
        }
        return this._config;
    }

    get logger(): ILogger {
        if (!this._logger) {
            this._logger = this.logManger.getLogger();
        }
        return this._logger;
    }

    get logManger(): ILoggerManger {
        if (!this._logManger) {
            this._logManger = this.container.resolve<ILoggerManger>(this.config.adapter || 'console');
            if (this.config.config) {
                this._logManger.configure(this.config.config);
            }
        }
        return this._logManger;
    }

    protected processLog(joinPoint: Joinpoint, annotation?: LoggerMetadata[]) {
        if (annotation && annotation.length) {
            annotation.forEach(logmeta => {
                let canlog = false;
                if (logmeta.express && logmeta.express(joinPoint)) {
                    canlog = true;
                } else if (!logmeta.express) {
                    canlog = true;
                }
                if (canlog) {
                    this.writeLog(logmeta.logname ? this.logManger.getLogger(logmeta.logname) : this.logger, joinPoint, logmeta.message);
                }
            });
        } else {
            this.writeLog(this.logger, joinPoint);
        }
    }

    protected writeLog(logger: ILogger, joinPoint: Joinpoint, message?: string) {

        let isCustom = isFunction(this.config.customFormat);

        if (message) {
            logger.info(message);
        }

        if (isCustom) {
            this.config.customFormat(joinPoint, logger);
        } else if (this.config.format) {
            let formatStr = isFunction(this.config.format) ? this.config.format(joinPoint, logger) : '';
            if (!formatStr) {
                return;
            }
            let formatArgs = isFunction(this.config.formatArgs) ? this.config.formatArgs(joinPoint, logger) : [];
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
