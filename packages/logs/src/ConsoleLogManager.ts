import { Injectable, Singleton } from '@tsdi/ioc';
import { NonePointcut } from '@tsdi/aop';
import { ILoggerManager, LoggerConfig, LoggerManagerToken } from './ILoggerManager';
import { ILogger } from './ILogger';
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

/**
 * console log manager.
 *
 * @export
 * @class ConsoleLogManager
 * @implements {ILoggerManager}
 */
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

/**
 * console log.
 *
 * @class ConsoleLog
 * @implements {ILogger}
 */
class ConsoleLog implements ILogger {

    level: string;

    constructor() {

    }

    log(...args: any[]): void {
        console.log(...args);
    }
    trace(...args: any[]): void {
        if (!this.level || Levels[this.level] === 0) {
            console.debug(...args);
        }
    }
    debug(...args: any[]): void {
        // console.debug in nuix will not console.
        if (!this.level || Levels[this.level] <= 1) {
            console.debug(...args);
        }
    }
    info(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 2) {
            console.info(...args);
        }
    }
    warn(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 3) {
            console.warn(...args);
        }
    }
    error(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 4) {
            console.error(...args);
        }
    }
    fatal(...args: any[]): void {
        if (!this.level || Levels[this.level] <= 5) {
            console.error(...args);
        }
    }
}
