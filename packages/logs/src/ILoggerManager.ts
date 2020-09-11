import { ObjectMap } from '@tsdi/ioc';
import { ILogger } from './ILogger';

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
