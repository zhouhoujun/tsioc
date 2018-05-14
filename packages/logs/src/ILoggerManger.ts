import { ObjectMap } from '@ts-ioc/core';
import { Level } from './Level';
import { ILogger } from './ILogger';

/**
 * logger configuation.
 *
 * @export
 * @interface LoggerConfig
 * @extends {ObjectMap<any>}
 */
export interface LoggerConfig extends ObjectMap<any> {
}

/**
 * logger manager.
 *
 * @export
 * @interface ILoggerManger
 */
export interface ILoggerManger {
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
