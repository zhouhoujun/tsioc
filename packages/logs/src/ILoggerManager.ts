import { ObjectMap, Type } from '@tsdi/ioc';
import { ILogger } from './ILogger';
import { LogConfigure } from './LogConfigure';

/**
 * logger configuation.
 *
 * @export
 * @interface LoggerConfig
 * @extends {ObjectMap}
 */
export interface LoggerConfig extends ObjectMap {
}


/**
 * logger manager.
 *
 * @export
 * @interface ILoggerManger
 */
export interface ILoggerManager {
    /**
     * config logger context.
     *
     * @param {LoggerConfig} config
     * @memberof ILoggerManger
     */
    configure(config: LoggerConfig): void;
    /**
     * get logger.
     *
     * @param {string} [name]
     * @returns {ILogger}
     * @memberof ILoggerManger
     */
    getLogger(name?: string): ILogger
}




/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 * @interface IConfigureLoggerManager
 * @extends {ILoggerManager}
 */
export interface IConfigureLoggerManager extends ILoggerManager {
    /**
     * readonly config.
     *
     * @type {LogConfigure}
     * @memberof IConfigureLoggerManager
     */
    readonly config: LogConfigure;

    /**
     * set log configure.
     *
     * @param {(LogConfigure | Type<LogConfigure>)} config
     * @memberof IConfigureLoggerManager
     */
    setLogConfigure(config: LogConfigure | Type<LogConfigure>);

}
