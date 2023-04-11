import { Injectable, Injector, lang } from '@tsdi/ioc';
import { NonePointcut } from '@tsdi/aop';
import { PROCESS_ROOT } from '@tsdi/core';
import { LoggerManager, Logger } from '@tsdi/logs';
import * as log4js from 'log4js';
import { isAbsolute, join } from 'path';

/**
 * log4js logger manager adapter.
 */
@NonePointcut()
@Injectable(LoggerManager, 'log4js', { static: true, providedIn: 'root' })
export class Log4jsAdapter implements LoggerManager {
    private _log4js?: log4js.Log4js;

    constructor(private injector: Injector) {

    }

    getLog4js(): log4js.Log4js {
        if (!this._log4js) {
            this._log4js = log4js
        }
        return this._log4js
    }

    configure(config: log4js.Configuration) {
        const root = this.injector.get(PROCESS_ROOT);
        lang.forIn(config.appenders, (appender: any, name) => {
            if (appender.filename && !isAbsolute(appender.filename)) {
                appender.filename = join(root, appender.filename)
            }
        });
        this.getLog4js().configure(config)
    }
    getLogger(name?: string): Logger {
        return this.getLog4js().getLogger(name) as any
    }

}
