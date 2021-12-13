import { Abstract, tokenId } from '@tsdi/ioc';
import { ILogger } from './ILogger';

/**
 * logger configuation.
 *
 * @export
 * @interface LoggerConfig
 * @extends {Record<string, any>}
 */
export interface LoggerConfig extends Record<string, any> { }

/**
 * logger manager.
 */
@Abstract()
export abstract class LoggerManager {
    static ρNPT = true;
    /**
     * config logger context.
     *
     * @param {LoggerConfig} config
     */
    abstract configure(config: LoggerConfig): void;
    /**
     * get logger.
     *
     * @param {string} [name]
     * @returns {ILogger}
     */
    abstract getLogger(name?: string): ILogger
}


/**
 * global default configuration.
 */
export const LOGGER_MANAGER = tokenId<LoggerManager>('LOGGER_MANAGER');
