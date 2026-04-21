import { noPointcut } from '@tsdi/ioc';
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
export declare abstract class LoggerManager {
    static [noPointcut]: boolean;
    /**
     * config logger context.
     *
     * @param {LoggerConfig|string} config
     */
    abstract configure(config: LoggerConfig | string): void;
    /**
     * get logger.
     *
     * @param {string} [name]
     * @returns {Logger}
     */
    abstract getLogger(name?: string): Logger;
}
