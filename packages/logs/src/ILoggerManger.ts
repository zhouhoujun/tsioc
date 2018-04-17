import { ILogger } from './ILogger';

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
     * @param {*} config
     * @memberof ILoggerManger
     */
    configure(config: any): void;
    /**
     * get logger.
     *
     * @param {string} [name]
     * @returns {ILogger}
     * @memberof ILoggerManger
     */
    getLogger(name?: string): ILogger
}
