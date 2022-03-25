
/**
 * logger interface
 *
 * @export
 * @interface ILogger
 */
 export interface ILogger {
    /**
     * logger name.
     */
    readonly name?: string;
    /**
     * logger level
     *
     * @type {string}
     */
    level: string;

    formatHeader?: boolean;

    /**
     * log, base log.
     *
     * @param {...any[]} messages
     */
    log(...messages: any[]): void;

    /**
     * trace log.
     *
     * @param {...any[]} messages
     */
    trace(...messages: any[]): void;

    /**
     * debg log.
     *
     * @param {...any[]} messages
     */
    debug(...messages: any[]): void;
    /**
     * debg log.
     *
     * @param {...any[]} messages
     */
    debug(...messages: any[]): void;

    /**
     * info log.
     *
     * @param {...any[]} messages
     */
    info(...messages: any[]): void;

    /**
     * warn log.
     *
     * @param {...any[]} messages
     */
    warn(...messages: any[]): void;

    /**
     * error log.
     *
     * @param {...any[]} messages
     */
    error(...messages: any[]): void;

    /**
     * fatal error log.
     *
     * @param {...any[]} messages
     */
    fatal(...messages: any[]): void;
}
