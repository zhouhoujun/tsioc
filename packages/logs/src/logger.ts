import { Abstract } from "@tsdi/ioc";

@Abstract()
export abstract class Logger {
    /**
         * logger name.
         */
    abstract get name(): string | undefined;
    /**
     * logger level
     *
     * @type {string}
     */
    abstract get level(): string;
    abstract set level(level: string);

    abstract formatHeader?: boolean;

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
