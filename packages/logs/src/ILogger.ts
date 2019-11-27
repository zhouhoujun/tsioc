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
     * @param {...any[]} messages
     * @memberof ILogger
     */
    log(...messages: any[]): void;

    /**
     * trace log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    trace(...messages: any[]): void;

    /**
     * debg log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    debug(...messages: any[]): void;
    /**
     * debg log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    debug(...messages: any[]): void;

    /**
     * info log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    info(...messages: any[]): void;

    /**
     * warn log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    warn(...messages: any[]): void;

    /**
     * error log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    error(...messages: any[]): void;

    /**
     * fatal error log.
     *
     * @param {...any[]} messages
     * @memberof ILogger
     */
    fatal(...messages: any[]): void;

}
