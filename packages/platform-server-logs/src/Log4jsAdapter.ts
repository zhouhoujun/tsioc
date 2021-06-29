import { Injectable } from '@tsdi/ioc';
import { NonePointcut } from '@tsdi/aop';
import { ILoggerManager, ILogger, LoggerManagerToken } from '@tsdi/logs';
import * as log4js from 'log4js';

/**
 * log4js logger manager adapter.
 */
@NonePointcut()
@Injectable(LoggerManagerToken, 'log4js', { singleton: true })
export class Log4jsAdapter implements ILoggerManager {
    private _log4js: any;

    getLog4js() {
        if (!this._log4js) {
            this._log4js = log4js;
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
