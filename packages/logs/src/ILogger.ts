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
     * @param {*} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    log(message: any, ...args: any[]): void;

    /**
     * trace log.
     *
     * @param {any} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    trace(message: any, ...args: any[]): void;

    /**
     * debg log.
     *
     * @param {any} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    debug(message: any, ...args: any[]): void;

    /**
     * info log.
     *
     * @param {any} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    info(message: any, ...args: any[]): void;

    /**
     * warn log.
     *
     * @param {any} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    warn(message: any, ...args: any[]): void;

    /**
     * error log.
     *
     * @param {any} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    error(message: any, ...args: any[]): void;

    /**
     * fatal error log.
     *
     * @param {any} message
     * @param {...any[]} args
     * @memberof ILogger
     */
    fatal(message: any, ...args: any[]): void;

}
