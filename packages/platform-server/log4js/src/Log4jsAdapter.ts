import { Inject, Injectable, lang } from '@tsdi/ioc';
import { NonePointcut } from '@tsdi/aop';
import { ApplicationArguments } from '@tsdi/core';
import { LoggerManager, Logger } from '@tsdi/logger';
import * as log4js from 'log4js';
import { isAbsolute, join } from 'node:path';

@NonePointcut()
@Injectable(LoggerManager, 'log4js')
export class Log4jsAdapter implements LoggerManager {

    constructor(@Inject(ApplicationArguments) private appArgs: ApplicationArguments) {

    }

    configure(config: log4js.Configuration) {
        const root = this.appArgs.baseURL;
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
