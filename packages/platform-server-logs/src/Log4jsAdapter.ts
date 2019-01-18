
import { ILoggerManager, ILogger, LoggerManagerToken } from '@ts-ioc/logs';
import { NonePointcut } from '@ts-ioc/aop';
import { Singleton, Injectable } from '@ts-ioc/core';

/**
 * log4js logger manager adapter.
 *
 * @export
 * @class Log4jsAdapter
 * @implements {ILoggerManger}
 */
@NonePointcut
@Singleton
@Injectable(LoggerManagerToken, 'log4js')
export class Log4jsAdapter implements ILoggerManager {
    private _log4js: any;
    constructor() {
    }
    getLog4js() {
        if (!this._log4js) {
            this._log4js = require('log4js');
        }
        return this._log4js;
    }
    configure(config: any) {
        this.getLog4js().configure(config);
    }
    getLogger(name?: string): ILogger {
        return this.getLog4js().getLogger(name);
    }

}
