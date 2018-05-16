import { Injectable, Singleton, isString } from '@ts-ioc/core';
import { ILoggerManager, LoggerConfig, LoggerManagerToken } from './ILoggerManager';
import { ILogger } from './ILogger';
import { NonePointcut } from '@ts-ioc/aop';
import { Levels } from './Level';

/**
 * console logger configuration.
 *
 * @export
 * @interface ConsoleLoggerConfig
 * @extends {LoggerConfig}
 */
export interface ConsoleLoggerConfig extends LoggerConfig {
    level?: string;
}

@NonePointcut()
@Singleton()
@Injectable(LoggerManagerToken, 'console')
export class ConsoleLogManager implements ILoggerManager {
    private logger: ILogger;
    constructor() {
        this.logger = new ConsoleLog();
    }
    configure(config: ConsoleLoggerConfig) {
        if (config && config.level) {
            this.logger.level = config.level;
        }
    }
    getLogger(name?: string): ILogger {
        return this.logger;
    }

}


class ConsoleLog implements ILogger {

    level: string;

    constructor() {

    }

    log(message: any, ...args: any[]): void {
        console.log(message, ...args);
    }
    trace(message: any, ...args: any[]): void {
        if (!this.level || Levels[this.level] === 0) {
            console.debug(message, ...args);
        }
    }
    debug(message: any, ...args: any[]): void {
        // console.debug in nuix will not console.
        if (!this.level || Levels[this.level] <= 1) {
            console.debug(message, ...args);
        }
    }
    info(message: any, ...args: any[]): void {
        if (!this.level || Levels[this.level] <= 2) {
            console.info(message, ...args);
        }
    }
    warn(message: any, ...args: any[]): void {
        if (!this.level || Levels[this.level] <= 3) {
            console.warn(message, ...args);
        }
    }
    error(message: any, ...args: any[]): void {
        if (!this.level || Levels[this.level] <= 4) {
            console.error(message, ...args);
        }
    }
    fatal(message: any, ...args: any[]): void {
        if (!this.level || Levels[this.level] <= 5) {
            console.error(message, ...args);
        }
    }
}
