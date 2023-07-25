import { Inject, Injectable, lang } from '@tsdi/ioc';
import { NonePointcut } from '@tsdi/aop';
import { PROCESS_ROOT } from '@tsdi/core';
import { LoggerManager, Logger } from '@tsdi/logs';
import * as log4js from 'log4js';
import { isAbsolute, join } from 'path';

/**
 * log4js logger manager adapter.
 */
@NonePointcut()
@Injectable(LoggerManager, 'log4js')
export class Log4jsAdapter implements LoggerManager {

    constructor(@Inject(PROCESS_ROOT) private root: string) {

    }

    configure(config: log4js.Configuration) {
        const root = this.root;
        lang.forIn(config.appenders, (appender: any, name) => {
            if (appender.filename && !isAbsolute(appender.filename)) {
                appender.filename = join(root, appender.filename)
            }
        });
        log4js.configure(config)
    }
    
    getLogger(name?: string): Logger {
        return log4js.getLogger(name) as any
    }

}
