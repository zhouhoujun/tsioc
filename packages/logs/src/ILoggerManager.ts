import { ObjectMap, InjectToken } from '@tsdi/ioc';
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
 * LoggerManger interface token.
 * it is a token id, you can register yourself LoggerManger for this.
 */
export const LoggerManagerToken = new InjectToken<ILoggerManager>('DI_ILoggerManager');
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
