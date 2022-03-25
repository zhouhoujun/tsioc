import { Abstract, tokenId } from '@tsdi/ioc';
import { ILogger } from './logger';
import { LoggerFactory } from './factory';

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
export abstract class LoggerManager implements LoggerFactory {
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
 * global default logger manager.
 */
export const LOGGER_MANAGER = tokenId<LoggerManager>('LOGGER_MANAGER');
