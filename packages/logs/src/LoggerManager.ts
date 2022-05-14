import { Abstract } from '@tsdi/ioc';
import { Level } from './Level';
import { Logger } from './logger';

/**
 * logger configuation.
 *
 * @export
 * @interface LoggerConfig
 * @extends {Record<string, any>}
 */
export interface LoggerConfig extends Record<string, any> {
    level?: Level;
}



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
     * @returns {Logger}
     */
    abstract getLogger(name?: string): Logger;
}
