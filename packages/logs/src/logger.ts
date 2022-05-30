import { Abstract } from '@tsdi/ioc';
import { Level } from './Level';


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

/**
 * logger
 */
@Abstract()
export abstract class Logger implements ILogger {
    /**
         * logger name.
         */
    abstract get name(): string | undefined;
    /**
     * logger level
     *
     * @type {Level}
     */
    abstract get level(): Level;
    abstract set level(level: Level);

    /**
     * log, base log.
     *
     * @param {...any[]} messages
     */
    abstract log(...messages: any[]): void;

    /**
     * trace log.
     *
     * @param {...any[]} messages
     */
    abstract trace(...messages: any[]): void;

    /**
     * debg log.
     *
     * @param {...any[]} messages
     */
    abstract debug(...messages: any[]): void;
    /**
     * debg log.
     *
     * @param {...any[]} messages
     */
    abstract debug(...messages: any[]): void;

    /**
     * info log.
     *
     * @param {...any[]} messages
     */
    abstract info(...messages: any[]): void;

    /**
     * warn log.
     *
     * @param {...any[]} messages
     */
    abstract warn(...messages: any[]): void;

    /**
     * error log.
     *
     * @param {...any[]} messages
     */
    abstract error(...messages: any[]): void;

    /**
     * fatal error log.
     *
     * @param {...any[]} messages
     */
    abstract fatal(...messages: any[]): void;
}

/**
 * logger header formater.
 */
@Abstract()
export abstract class HeaderFormater {
    abstract format(name: string, level: string): string[];
}
