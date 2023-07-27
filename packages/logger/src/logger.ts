import { Abstract } from '@tsdi/ioc';
import { Level } from './Level';


/**
 * logger
 */
@Abstract()
export abstract class Logger {
    /**
     * logger category name.
     */
    abstract get category(): string;
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
 * @deprecated use `Logger` instead.
 */
export type ILogger = Logger;

/**
 * logger header formater.
 */
@Abstract()
export abstract class HeaderFormater {
    abstract format(name: string, level: string): string[];
}
