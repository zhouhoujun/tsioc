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
export interface LoggerConfig extends ObjectMap { }

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
     */
    configure(config: LoggerConfig): void;
    /**
     * get logger.
     *
     * @param {string} [name]
     * @returns {ILogger}
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
     */
    readonly config: LogConfigure;

    /**
     * set log configure.
     *
     * @param {(LogConfigure | Type<LogConfigure>)} config
     */
    setLogConfigure(config: LogConfigure | Type<LogConfigure>);

}
