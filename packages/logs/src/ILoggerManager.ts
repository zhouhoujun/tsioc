import { ObjectMap, InjectToken } from '@ts-ioc/core';
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
 * LoggerManger interface token.
 * it is a token id, you can register yourself LoggerManger for this.
 */
export const LoggerManagerToken = new InjectToken<ILoggerManager>('__IOC_ILoggerManager');
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
