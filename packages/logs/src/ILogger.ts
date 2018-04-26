

/**
 * logger interface
 *
 * @export
 * @interface ILogger
 */
export interface ILogger {

    /**
     * logger level
     *
     * @type {string}
     * @memberof ILogger
     */
    level: string;

    /**
     * log, base log.
     *
     * @param {...any[]} args
     * @memberof ILogger
     */
    log(...args: any[]): void;

    /**
     * trace log.
     *
     * @param {string} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    trace(message: string, ...args: any[]): void;

    /**
     * debg log.
     *
     * @param {string} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    debug(message: string, ...args: any[]): void;

    /**
     * info log.
     *
     * @param {string} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    info(message: string, ...args: any[]): void;

    /**
     * warn log.
     *
     * @param {string} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    warn(message: string, ...args: any[]): void;

    /**
     * error log.
     *
     * @param {string} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    error(message: string, ...args: any[]): void;

    /**
     * fatal error log.
     *
     * @param {string} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    fatal(message: string, ...args: any[]): void;

}
